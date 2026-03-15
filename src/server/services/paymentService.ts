import { prisma } from "@/lib/prisma";
import * as gateway from "@/server/payments/PaymentGateway";
import { updateOrderStatus, updatePaymentAttemptStatus } from "@/server/orders/orderQueries";
import { logger } from "@/lib/logger";

/**
 * Parallel-race retry strategy: fire multiple gateway calls concurrently,
 * take the first success. Much faster than sequential retries.
 */
const PARALLEL_BATCH_SIZE = 3;       // calls per batch
const CREATE_BATCHES = 3;            // max batches for creation (9 total attempts)
const CONFIRM_BATCHES = 3;           // max batches for confirmation (9 total attempts)
const BATCH_GAP_MS = 800;            // pause between batches

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Race N gateway calls in parallel. Returns the first successful result,
 * or the last failure if all fail. Terminal results (non-retryable) short-circuit.
 */
async function raceCreate(
  params: Parameters<typeof gateway.createCheckout>[0],
  count: number,
): Promise<gateway.CreateCheckoutResult> {
  const results = await Promise.all(
    Array.from({ length: count }, () => gateway.createCheckout(params)),
  );
  // Return first success
  const success = results.find((r) => r.success);
  if (success) return success;
  // Return first non-retryable (terminal)
  const terminal = results.find((r) => !r.success && !r.retryable);
  if (terminal) return terminal;
  // All retryable failures — return last one
  return results[results.length - 1];
}

async function raceConfirm(
  params: Parameters<typeof gateway.confirmCheckout>[0],
  count: number,
): Promise<gateway.ConfirmCheckoutResult> {
  const results = await Promise.all(
    Array.from({ length: count }, () => gateway.confirmCheckout(params)),
  );
  // Return first "paid"
  const paid = results.find((r) => r.status === "paid");
  if (paid) return paid;
  // Return first terminal (fraud / non-retryable failure)
  const terminal = results.find(
    (r) => r.status === "fraud_rejected" || (r.status === "failed" && !r.retryable),
  );
  if (terminal) return terminal;
  // All deferred/retryable — return last
  return results[results.length - 1];
}

export async function initiateCheckoutPayment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!order) throw new Error("Order not found");

  const paymentAttempt = order.paymentAttempts[0];
  if (!paymentAttempt) throw new Error("No payment attempt found");

  const createParams = {
    amount: order.subtotalAmount,
    currency: order.currency as "USD" | "EUR" | "JPY",
    orderId,
  };

  // Fire parallel batches — much faster than sequential retries
  let lastResult: gateway.CreateCheckoutResult | null = null;
  for (let batch = 0; batch < CREATE_BATCHES; batch++) {
    if (batch > 0) {
      logger.info("Create batch retry", { orderId, batch });
      await delay(BATCH_GAP_MS);
    }

    const result = await raceCreate(createParams, PARALLEL_BATCH_SIZE);
    logger.info("Create batch result", { orderId, batch, success: result.success });

    if (result.success) {
      await prisma.paymentAttempt.update({
        where: { id: paymentAttempt.id },
        data: { providerCheckoutId: result.checkoutId },
      });
      await updateOrderStatus(orderId, "pending_payment");
      return {
        success: true as const,
        checkoutId: result.checkoutId,
        paymentAttemptId: paymentAttempt.id,
      };
    }

    lastResult = result;
    if (!result.retryable) break;
  }

  const result = lastResult!;
  logger.warn("Checkout creation exhausted all batches", {
    orderId,
    code: result.code,
    retryable: result.retryable,
    totalAttempts: CREATE_BATCHES * PARALLEL_BATCH_SIZE,
  });

  if (!result.retryable) {
    await updatePaymentAttemptStatus(paymentAttempt.id, "failed", {
      failureCode: result.code,
      failureMessage: result.message,
    });
    await updateOrderStatus(orderId, "payment_failed");
    return {
      success: false as const,
      retryable: false,
      message: result.message,
      code: result.code,
    };
  }

  // Retryable failure — return pending so client can poll instead of seeing an error
  return {
    success: false as const,
    pending: true as const,
    orderId,
    paymentAttemptId: paymentAttempt.id,
  };
}

/** For polling: check if we have a checkoutId (from webhook or DB), or try one create. No long retries. */
export async function getCheckoutStatus(orderId: string): Promise<
  | { status: "ready"; checkoutId: string; paymentAttemptId: number }
  | { status: "pending" }
  | { status: "failed"; message: string; retryable: boolean }
> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!order) {
    return { status: "failed", message: "Order not found", retryable: false };
  }

  const attempt = order.paymentAttempts[0];
  if (!attempt) {
    return { status: "failed", message: "No payment attempt", retryable: false };
  }

  // Already have checkoutId (set by webhook or earlier poll)
  if (attempt.providerCheckoutId) {
    await updateOrderStatus(orderId, "pending_payment");
    return {
      status: "ready",
      checkoutId: attempt.providerCheckoutId,
      paymentAttemptId: attempt.id,
    };
  }

  // Fire parallel attempts per poll — faster than a single try
  const result = await raceCreate(
    { amount: order.subtotalAmount, currency: order.currency as "USD" | "EUR" | "JPY", orderId },
    PARALLEL_BATCH_SIZE,
  );

  if (result.success) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { providerCheckoutId: result.checkoutId },
    });
    await updateOrderStatus(orderId, "pending_payment");
    return {
      status: "ready",
      checkoutId: result.checkoutId,
      paymentAttemptId: attempt.id,
    };
  }

  // All retryable — tell client to keep polling
  if (result.retryable) {
    return { status: "pending" };
  }

  return {
    status: "failed",
    message: result.message,
    retryable: false,
  };
}

export async function confirmCheckoutPayment(
  orderId: string,
  paymentAttemptId: number,
  paymentToken: string
) {
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: paymentAttemptId },
    include: { order: true },
  });

  if (!attempt || attempt.orderId !== orderId) {
    throw new Error("Invalid payment attempt");
  }

  if (attempt.order.status === "paid") {
    return { status: "already_paid" as const, publicOrderId: attempt.order.publicOrderId };
  }

  if (!attempt.providerCheckoutId) {
    throw new Error("No checkout session found for this payment attempt");
  }

  // Mark as confirming
  await updatePaymentAttemptStatus(paymentAttemptId, "confirming");

  // Parallel-race confirm: fire multiple calls concurrently per batch.
  // Gateway often returns 202-deferred — racing increases chance of 201-immediate.
  const confirmParams = { checkoutId: attempt.providerCheckoutId, paymentToken };
  let lastResult: gateway.ConfirmCheckoutResult | null = null;

  for (let batch = 0; batch < CONFIRM_BATCHES; batch++) {
    if (batch > 0) {
      logger.info("Confirm batch retry", { orderId, batch });
      await delay(BATCH_GAP_MS);
    }

    const result = await raceConfirm(confirmParams, PARALLEL_BATCH_SIZE);
    logger.info("Confirm batch result", { orderId, batch, status: result.status });

    // Immediate success — done!
    if (result.status === "paid") {
      await updatePaymentAttemptStatus(paymentAttemptId, "succeeded", {
        providerPaymentId: result.confirmationId,
      });
      await updateOrderStatus(orderId, "paid");
      return { status: "paid" as const, publicOrderId: attempt.order.publicOrderId };
    }

    // Fraud rejection — terminal, don't retry
    if (result.status === "fraud_rejected") {
      await updatePaymentAttemptStatus(paymentAttemptId, "fraud_rejected", {
        failureMessage: result.message,
      });
      await updateOrderStatus(orderId, "fraud_rejected");
      return { status: "fraud_rejected" as const, publicOrderId: attempt.order.publicOrderId };
    }

    // Non-retryable failure — terminal
    if (result.status === "failed" && !result.retryable) {
      await updatePaymentAttemptStatus(paymentAttemptId, "failed", {
        failureMessage: result.message,
      });
      await updateOrderStatus(orderId, "payment_failed");
      return {
        status: "failed" as const,
        retryable: false,
        publicOrderId: attempt.order.publicOrderId,
        message: result.message,
      };
    }

    // Retryable (processing/deferred, retryable failure) — next batch
    lastResult = result;
  }

  // Exhausted all confirm batches — accept whatever we got last
  logger.warn("Confirm batches exhausted", {
    orderId,
    totalAttempts: CONFIRM_BATCHES * PARALLEL_BATCH_SIZE,
    lastStatus: lastResult?.status,
  });

  if (lastResult?.status === "processing") {
    await updatePaymentAttemptStatus(paymentAttemptId, "processing");
    await updateOrderStatus(orderId, "payment_processing");
    return { status: "processing" as const, publicOrderId: attempt.order.publicOrderId };
  }

  if (lastResult?.status === "failed") {
    await updatePaymentAttemptStatus(paymentAttemptId, "failed", {
      failureMessage: lastResult.message,
    });
    return {
      status: "failed" as const,
      retryable: true,
      publicOrderId: attempt.order.publicOrderId,
      message: lastResult.message,
    };
  }

  // Fallback
  await updatePaymentAttemptStatus(paymentAttemptId, "processing");
  await updateOrderStatus(orderId, "payment_processing");
  return { status: "processing" as const, publicOrderId: attempt.order.publicOrderId };
}
