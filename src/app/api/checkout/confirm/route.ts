import { NextRequest, NextResponse } from "next/server";
import { CheckoutConfirmSchema } from "@/lib/zod";
import { confirmCheckoutPayment } from "@/server/services/paymentService";
import { ConcurrentModificationError } from "@/server/orders/orderQueries";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CheckoutConfirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid confirmation data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { orderId, paymentAttemptId, paymentToken } = parsed.data;

    const result = await confirmCheckoutPayment(orderId, paymentAttemptId, paymentToken);

    logger.info("Checkout confirm result", {
      orderId,
      paymentAttemptId,
      status: result.status,
      publicOrderId: result.publicOrderId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConcurrentModificationError) {
      logger.info("Concurrent confirm rejected", { error: error.message });
      return NextResponse.json(
        { error: "Payment is already being processed." },
        { status: 409 }
      );
    }

    logger.error("Checkout confirm error", { error: String(error) });
    return NextResponse.json(
      { error: "An unexpected error occurred during payment confirmation." },
      { status: 500 }
    );
  }
}
