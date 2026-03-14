import { NextRequest, NextResponse } from "next/server";
import { CartValidateSchema } from "@/lib/zod";
import { validateCart } from "@/server/services/cartService";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CartValidateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid cart data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = validateCart(parsed.data.items);

  if ("error" in result) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    currency: result.currency,
    subtotal: result.subtotal,
    items: result.items.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      unitAmount: i.product.amount,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
      currency: i.product.currency,
    })),
  });
}
