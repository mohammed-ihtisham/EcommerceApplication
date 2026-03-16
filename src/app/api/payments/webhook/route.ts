import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findPaymentAttemptByCheckoutId,
  findPaymentAttemptByOrderId,
  updatePaymentAndOrderStatus,
  ConcurrentModificationError,
} from "@/server/orders/orderQueries";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    logger.info("Webhook received", { type: event.type, uid: event.uid });

    if (!event.uid || !event.type) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // Idempotency check
    const existing = await prisma.webhookEvent.findUnique({
      where: { providerEventId: event.uid },
    });

    if (existing) {
      logger.info("Duplicate webhook event, skipping", { uid: event.uid });
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Store the event
    await prisma.webhookEvent.create({
      data: {
        providerEventId: event.uid,
        type: event.type,
        payloadJson: JSON.stringify(event),
        processedAt: new Date(),
      },
    });

    const checkoutId = event.data?.checkoutId;

    // checkout.create.success (deferred): correlate by customerId (we send "o" + orderId without hyphens)
    if (event.type === "checkout.create.success" && checkoutId) {
      const customerId = event.data?.customerId as string | undefined;
      if (typeof customerId === "string" && customerId.startsWith("o") && customerId.length === 33) {
        const hex = customerId.slice(1);
        const orderId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
        const attempt = await findPaymentAttemptByOrderId(orderId);
        if (attempt && !attempt.providerCheckoutId) {
          await prisma.$transaction(async (tx) => {
            await tx.paymentAttempt.updateMany({
              where: { id: attempt.id, version: attempt.version },
              data: { providerCheckoutId: checkoutId, version: { increment: 1 } },
            });
            await tx.order.updateMany({
              where: { id: attempt.orderId, version: attempt.order.version },
              data: { status: "pending_payment", version: { increment: 1 } },
            });
          });
          logger.info("Checkout ID received via webhook (deferred create)", {
            orderId,
            checkoutId,
            paymentAttemptId: attempt.id,
          });
        }
      }
      return NextResponse.json({ received: true });
    }

    if (!checkoutId) {
      logger.warn("Webhook event missing checkoutId", { uid: event.uid });
      return NextResponse.json({ received: true });
    }

    const attempt = await findPaymentAttemptByCheckoutId(checkoutId);
    if (!attempt) {
      logger.warn("No payment attempt found for webhook", { checkoutId });
      return NextResponse.json({ received: true });
    }

    // Map webhook event type to state transitions (transactional)
    try {
      switch (event.type) {
        case "checkout.confirm.success": {
          const confirmationId = event.data?.confirmationId;
          await updatePaymentAndOrderStatus(attempt.id, "succeeded", attempt.orderId, "paid", {
            providerPaymentId: confirmationId,
          });
          logger.info("Order paid via webhook", {
            orderId: attempt.orderId,
            paymentAttemptId: attempt.id,
            providerCheckoutId: checkoutId,
          });
          break;
        }

        case "checkout.confirm.failure": {
          const isFraud = event.data?.reason === "fraud";
          if (isFraud) {
            await updatePaymentAndOrderStatus(attempt.id, "fraud_rejected", attempt.orderId, "fraud_rejected", {
              failureMessage: event.data?.message || "Fraud detected",
            });
          } else {
            await updatePaymentAndOrderStatus(attempt.id, "failed", attempt.orderId, "payment_failed", {
              failureCode: event.data?.code,
              failureMessage: event.data?.message || "Payment failed",
            });
          }
          logger.info("Order payment failed via webhook", {
            orderId: attempt.orderId,
            paymentAttemptId: attempt.id,
            providerCheckoutId: checkoutId,
            isFraud,
          });
          break;
        }

        default:
          logger.info("Unhandled webhook event type", { type: event.type });
      }
    } catch (error) {
      // ConcurrentModificationError is expected when webhook races with sync confirm path
      if (error instanceof ConcurrentModificationError) {
        logger.info("Webhook concurrent modification (expected race with sync path)", {
          uid: event.uid,
          paymentAttemptId: attempt.id,
          orderId: attempt.orderId,
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Webhook processing error", { error: String(error) });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
