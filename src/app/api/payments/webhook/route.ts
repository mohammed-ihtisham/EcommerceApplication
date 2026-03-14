import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findPaymentAttemptByCheckoutId, updateOrderStatus, updatePaymentAttemptStatus } from "@/server/orders/orderQueries";
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
    if (!checkoutId) {
      logger.warn("Webhook event missing checkoutId", { uid: event.uid });
      return NextResponse.json({ received: true });
    }

    const attempt = await findPaymentAttemptByCheckoutId(checkoutId);
    if (!attempt) {
      logger.warn("No payment attempt found for webhook", { checkoutId });
      return NextResponse.json({ received: true });
    }

    // Map webhook event type to state transitions
    switch (event.type) {
      case "checkout.confirm.success": {
        const confirmationId = event.data?.confirmationId;
        await updatePaymentAttemptStatus(attempt.id, "succeeded", {
          providerPaymentId: confirmationId,
        });
        await updateOrderStatus(attempt.orderId, "paid");
        logger.info("Order paid via webhook", { orderId: attempt.orderId });
        break;
      }

      case "checkout.confirm.failure": {
        const isFraud = event.data?.reason === "fraud";
        if (isFraud) {
          await updatePaymentAttemptStatus(attempt.id, "fraud_rejected", {
            failureMessage: event.data?.message || "Fraud detected",
          });
          await updateOrderStatus(attempt.orderId, "fraud_rejected");
        } else {
          await updatePaymentAttemptStatus(attempt.id, "failed", {
            failureCode: event.data?.code,
            failureMessage: event.data?.message || "Payment failed",
          });
          await updateOrderStatus(attempt.orderId, "payment_failed");
        }
        logger.info("Order payment failed via webhook", {
          orderId: attempt.orderId,
          isFraud,
        });
        break;
      }

      default:
        logger.info("Unhandled webhook event type", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Webhook processing error", { error: String(error) });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
