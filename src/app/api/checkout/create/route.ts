import { NextRequest, NextResponse } from "next/server";
import { CheckoutCreateSchema } from "@/lib/zod";
import { validateCart } from "@/server/services/cartService";
import { createOrder } from "@/server/services/orderService";
import { initiateCheckoutPayment } from "@/server/services/paymentService";
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

    // Server-side cart validation and total recomputation
    const cartResult = validateCart(parsed.data.items);
    if ("error" in cartResult) {
      return NextResponse.json(
        { error: cartResult.error, code: cartResult.code },
        { status: 400 }
      );
    }

    // Create order and order items
    const order = await createOrder(cartResult);

    // Initiate payment with provider
    const paymentResult = await initiateCheckoutPayment(order.id);

    if (!paymentResult.success) {
      return NextResponse.json(
        {
          error: paymentResult.message,
          retryable: paymentResult.retryable,
          publicOrderId: order.publicOrderId,
        },
        { status: 502 }
      );
    }

    logger.info("Checkout created successfully", {
      orderId: order.id,
      publicOrderId: order.publicOrderId,
    });

    return NextResponse.json({
      orderId: order.id,
      publicOrderId: order.publicOrderId,
      checkoutId: paymentResult.checkoutId,
      paymentAttemptId: paymentResult.paymentAttemptId,
      currency: cartResult.currency,
      subtotal: cartResult.subtotal,
    });
  } catch (error) {
    logger.error("Checkout create error", { error: String(error) });
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
