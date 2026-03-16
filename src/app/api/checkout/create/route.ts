import { NextRequest, NextResponse } from "next/server";
import { CheckoutCreateSchema } from "@/lib/zod";
import { validateCart } from "@/server/services/cartService";
import { createOrder } from "@/server/services/orderService";
import { initiateCheckoutPayment } from "@/server/services/paymentService";
import { getExchangeRates } from "@/server/services/exchangeRateService";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CheckoutCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Fetch live exchange rates server-side
    const { rates } = await getExchangeRates();

    // Server-side cart validation with currency conversion
    const cartResult = validateCart(
      parsed.data.items,
      parsed.data.displayCurrency,
      rates
    );
    if ("error" in cartResult) {
      return NextResponse.json(
        { error: cartResult.error, code: cartResult.code },
        { status: 400 }
      );
    }

    // Create order with charge amounts and rate snapshot
    const order = await createOrder(cartResult, rates);

    // Initiate payment with provider
    const paymentResult = await initiateCheckoutPayment(order.id);

    if (paymentResult.success) {
      logger.info("Checkout created successfully", {
        orderId: order.id,
        publicOrderId: order.publicOrderId,
      });
      return NextResponse.json({
        status: "ready",
        orderId: order.id,
        publicOrderId: order.publicOrderId,
        checkoutId: paymentResult.checkoutId,
        paymentAttemptId: paymentResult.paymentAttemptId,
        currency: cartResult.chargeCurrency,
        subtotal: cartResult.chargeSubtotal,
      });
    }

    // Retryable failure (including deferred): return pending so client can poll
    if ("pending" in paymentResult && paymentResult.pending) {
      return NextResponse.json({
        status: "pending",
        orderId: paymentResult.orderId,
        publicOrderId: order.publicOrderId,
        paymentAttemptId: paymentResult.paymentAttemptId,
      });
    }

    // Non-retryable terminal failure
    return NextResponse.json(
      {
        error: paymentResult.message ?? "Payment failed",
        retryable: false,
        code: paymentResult.code,
        publicOrderId: order.publicOrderId,
      },
      { status: 502 }
    );
  } catch (error) {
    logger.error("Checkout create error", { error: String(error) });
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
