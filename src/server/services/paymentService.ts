import { prisma } from "@/lib/prisma";
import * as gateway from "@/server/payments/PaymentGateway";
import { updateOrderStatus, updatePaymentAttemptStatus } from "@/server/orders/orderQueries";
import { logger } from "@/lib/logger";

/** Fast path: 2 attempts then accept deferred so client can poll (no long blocking). */
const INITIAL_CREATE_ATTEMPTS = 2;
const SINGLE_RETRY_DELAY_MS = 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  let lastResult: gateway.CreateCheckoutResult | null = null;
  for (let attempt = 0; attempt < INITIAL_CREATE_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      logger.info("Retrying checkout creation", { orderId, attempt });
      await delay(SINGLE_RETRY_DELAY_MS);
    }

    const result = await gateway.createCheckout(createParams);

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
    // If deferred: return immediately so client can poll (no long blocking)
    if (result.code === "deferred") {
      logger.info("Checkout deferred, client will poll", { orderId });
      return {
        success: false as const,
        deferred: true as const,
        orderId,
        paymentAttemptId: paymentAttempt.id,
      };
    }
  }

  const result = lastResult!;
  logger.warn("Checkout creation failed", { orderId, code: result.code, retryable: result.retryable });

  if (!result.retryable) {
    await updatePaymentAttemptStatus(paymentAttempt.id, "failed", {
      failureCode: result.code,
      failureMessage: result.message,
    });
    await updateOrderStatus(orderId, "payment_failed");
  }

  return {
    success: false as const,
    retryable: result.retryable,
    message: result.message,
    code: result.code,
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

  // One quick try so we don't block the poll
  const result = await gateway.createCheckout({
    amount: order.subtotalAmount,
    currency: order.currency as "USD" | "EUR" | "JPY",
    orderId,
  });

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

  if (result.code === "deferred") {
    return { status: "pending" };
  }

  return {
    status: "failed",
    message: result.message,
    retryable: result.retryable,
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

  const result = await gateway.confirmCheckout({
    checkoutId: attempt.providerCheckoutId,
    paymentToken,
  });

  logger.info("Payment confirmation result", {
    orderId,
    paymentAttemptId,
    status: result.status,
  });

  switch (result.status) {
    case "paid": {
      await updatePaymentAttemptStatus(paymentAttemptId, "succeeded", {
        providerPaymentId: result.confirmationId,
      });
      await updateOrderStatus(orderId, "paid");
      return { status: "paid" as const, publicOrderId: attempt.order.publicOrderId };
    }

    case "processing": {
      await updatePaymentAttemptStatus(paymentAttemptId, "processing");
      await updateOrderStatus(orderId, "payment_processing");
      return { status: "processing" as const, publicOrderId: attempt.order.publicOrderId };
    }

    case "fraud_rejected": {
      await updatePaymentAttemptStatus(paymentAttemptId, "fraud_rejected", {
        failureMessage: result.message,
      });
      await updateOrderStatus(orderId, "fraud_rejected");
      return { status: "fraud_rejected" as const, publicOrderId: attempt.order.publicOrderId };
    }

    case "failed": {
      await updatePaymentAttemptStatus(paymentAttemptId, "failed", {
        failureMessage: result.message,
      });
      if (!result.retryable) {
        await updateOrderStatus(orderId, "payment_failed");
      }
      return {
        status: "failed" as const,
        retryable: result.retryable,
        publicOrderId: attempt.order.publicOrderId,
        message: result.message,
      };
    }

    default:
      return { status: "processing" as const, publicOrderId: attempt.order.publicOrderId };
  }
}
