import { prisma } from "@/lib/prisma";
import * as gateway from "@/server/payments/PaymentGateway";
import { updateOrderStatus, updatePaymentAttemptStatus } from "@/server/orders/orderQueries";
import { logger } from "@/lib/logger";

const MAX_CREATE_RETRIES = 3;
const RETRY_DELAY_MS = 800;

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

  // Retry deferred/retryable responses server-side to avoid user having to click "Try Again"
  let lastResult: gateway.CreateCheckoutResult | null = null;
  for (let attempt = 0; attempt < MAX_CREATE_RETRIES; attempt++) {
    if (attempt > 0) {
      logger.info("Retrying checkout creation", { orderId, attempt });
      await delay(RETRY_DELAY_MS);
    }

    const result = await gateway.createCheckout({
      amount: order.subtotalAmount,
      currency: order.currency as "USD" | "EUR" | "JPY",
    });

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

    // Only retry if the failure is retryable
    if (!result.retryable) break;
  }

  // All retries exhausted or non-retryable failure
  const result = lastResult!;

  logger.warn("Checkout creation failed after retries", {
    orderId,
    code: result.code,
    retryable: result.retryable,
  });

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
