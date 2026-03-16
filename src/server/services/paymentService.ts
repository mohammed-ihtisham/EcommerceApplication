import { prisma } from "@/lib/prisma";
import * as gateway from "@/server/payments/PaymentGateway";
import {
  updateOrderStatus,
  updatePaymentAttemptStatus,
  updatePaymentAndOrderStatus,
  ConcurrentModificationError,
} from "@/server/orders/orderQueries";
import { isTerminalPaymentStatus, isTerminalOrderStatus } from "@/server/orders/stateMachine";
import type { PaymentAttemptStatus } from "@/server/orders/stateMachine";
import { retryWithBackoff } from "@/server/payments/retry";
import { SupportedCurrencySchema } from "@/lib/zod";
import { logger } from "@/lib/logger";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

export async function initiateCheckoutPayment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!order) throw new Error("Order not found");

  const paymentAttempt = order.paymentAttempts[0];
  if (!paymentAttempt) throw new Error("No payment attempt found");

  const currency = SupportedCurrencySchema.parse(order.currency);
  const idempotencyKey = `checkout:create:${paymentAttempt.id}`;

  // Idempotent guard: if we already have a checkoutId, don't call gateway again
  if (paymentAttempt.providerCheckoutId) {
    logger.info("Checkout already created, returning existing", {
      orderId,
      paymentAttemptId: paymentAttempt.id,
      providerCheckoutId: paymentAttempt.providerCheckoutId,
    });
    await updateOrderStatus(orderId, "pending_payment");
    return {
      success: true as const,
      checkoutId: paymentAttempt.providerCheckoutId,
      paymentAttemptId: paymentAttempt.id,
    };
  }

  const createParams = { amount: order.subtotalAmount, currency, orderId, idempotencyKey };

  const result = await retryWithBackoff(
    () => gateway.createCheckout(createParams),
    {
      maxRetries: MAX_RETRIES,
      baseDelayMs: BASE_DELAY_MS,
      shouldRetry: (r) => !r.success && r.retryable,
      onRetry: (attempt, prev) => {
        logger.info("Create checkout retry", {
          orderId,
          paymentAttemptId: paymentAttempt.id,
          idempotencyKey,
          attempt,
          previousCode: prev.success ? undefined : prev.code,
        });
      },
    },
  );

  if (result.success) {
    await prisma.paymentAttempt.update({
      where: { id: paymentAttempt.id },
      data: { providerCheckoutId: result.checkoutId },
    });
    await updateOrderStatus(orderId, "pending_payment");

    logger.info("Checkout created successfully", {
      orderId,
      paymentAttemptId: paymentAttempt.id,
      providerCheckoutId: result.checkoutId,
      idempotencyKey,
    });

    return {
      success: true as const,
      checkoutId: result.checkoutId,
      paymentAttemptId: paymentAttempt.id,
    };
  }

  // Terminal (non-retryable) failure
  if (!result.retryable) {
    logger.warn("Checkout creation failed (terminal)", {
      orderId,
      paymentAttemptId: paymentAttempt.id,
      code: result.code,
      idempotencyKey,
    });

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

  // Retryable failure exhausted — return pending for webhook reconciliation
  logger.warn("Checkout creation retries exhausted", {
    orderId,
    paymentAttemptId: paymentAttempt.id,
    code: result.code,
    idempotencyKey,
  });

  return {
    success: false as const,
    pending: true as const,
    orderId,
    paymentAttemptId: paymentAttempt.id,
  };
}

/**
 * Pure read — checks DB state only, no gateway calls, no side effects.
 * The webhook handler or initiateCheckoutPayment are responsible for mutations.
 */
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

  // Already have checkoutId (set by initiateCheckoutPayment or webhook)
  if (attempt.providerCheckoutId) {
    return {
      status: "ready",
      checkoutId: attempt.providerCheckoutId,
      paymentAttemptId: attempt.id,
    };
  }

  // Terminal order — no point polling further
  if (isTerminalOrderStatus(order.status as Parameters<typeof isTerminalOrderStatus>[0])) {
    return {
      status: "failed",
      message: "Order is in a terminal state",
      retryable: false,
    };
  }

  // Still waiting for webhook or next create attempt
  return { status: "pending" };
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

  // Guard: reject if payment attempt is already terminal
  const currentStatus = attempt.status as PaymentAttemptStatus;
  if (isTerminalPaymentStatus(currentStatus)) {
    throw new Error(`Payment attempt is already in terminal state: ${currentStatus}`);
  }

  // Guard: reject if already confirming or processing (concurrent confirm in flight)
  if (currentStatus === "confirming" || currentStatus === "processing") {
    throw new ConcurrentModificationError("PaymentAttempt", paymentAttemptId);
  }

  const idempotencyKey = `checkout:confirm:${paymentAttemptId}`;

  // Optimistic-locked transition to "confirming"
  await updatePaymentAttemptStatus(paymentAttemptId, "confirming");

  const confirmParams = {
    checkoutId: attempt.providerCheckoutId,
    paymentToken,
    idempotencyKey,
  };

  const result = await retryWithBackoff(
    () => gateway.confirmCheckout(confirmParams),
    {
      maxRetries: MAX_RETRIES,
      baseDelayMs: BASE_DELAY_MS,
      shouldRetry: (r) => r.status === "failed" && r.retryable,
      onRetry: (retryAttempt, prev) => {
        logger.info("Confirm checkout retry", {
          orderId,
          paymentAttemptId,
          idempotencyKey,
          attempt: retryAttempt,
          previousStatus: prev.status,
        });
      },
    },
  );

  logger.info("Confirm checkout result", {
    orderId,
    paymentAttemptId,
    idempotencyKey,
    providerCheckoutId: attempt.providerCheckoutId,
    status: result.status,
  });

  if (result.status === "paid") {
    await updatePaymentAndOrderStatus(paymentAttemptId, "succeeded", orderId, "paid", {
      providerPaymentId: result.confirmationId,
    });
    return { status: "paid" as const, publicOrderId: attempt.order.publicOrderId };
  }

  if (result.status === "fraud_rejected") {
    await updatePaymentAndOrderStatus(paymentAttemptId, "fraud_rejected", orderId, "fraud_rejected", {
      failureMessage: result.message,
    });
    return { status: "fraud_rejected" as const, publicOrderId: attempt.order.publicOrderId };
  }

  if (result.status === "failed" && !result.retryable) {
    await updatePaymentAndOrderStatus(paymentAttemptId, "failed", orderId, "payment_failed", {
      failureMessage: result.message,
    });
    return {
      status: "failed" as const,
      retryable: false,
      publicOrderId: attempt.order.publicOrderId,
      message: result.message,
    };
  }

  if (result.status === "processing") {
    await updatePaymentAndOrderStatus(paymentAttemptId, "processing", orderId, "payment_processing");
    return { status: "processing" as const, publicOrderId: attempt.order.publicOrderId };
  }

  // Retryable failure exhausted — mark as processing, let webhook finalize
  if (result.status === "failed" && result.retryable) {
    await updatePaymentAttemptStatus(paymentAttemptId, "failed", {
      failureMessage: result.message,
    });
    return {
      status: "failed" as const,
      retryable: true,
      publicOrderId: attempt.order.publicOrderId,
      message: result.message,
    };
  }

  // Fallback: treat as processing
  await updatePaymentAndOrderStatus(paymentAttemptId, "processing", orderId, "payment_processing");
  return { status: "processing" as const, publicOrderId: attempt.order.publicOrderId };
}
