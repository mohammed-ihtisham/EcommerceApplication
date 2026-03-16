import { NextRequest, NextResponse } from "next/server";
import { CartValidateSchema } from "@/lib/zod";
import { validateCart } from "@/server/services/cartService";
import { getExchangeRates } from "@/server/services/exchangeRateService";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CartValidateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid cart data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const displayCurrency = parsed.data.displayCurrency ?? "USD";
  const { rates } = await getExchangeRates();

  const result = validateCart(parsed.data.items, displayCurrency, rates);

  if ("error" in result) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    currency: result.chargeCurrency,
    subtotal: result.chargeSubtotal,
    items: result.items.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      unitAmount: i.chargeUnitAmount,
      quantity: i.quantity,
      lineTotal: i.chargeLineTotal,
      baseCurrency: i.product.currency,
      currency: result.chargeCurrency,
    })),
  });
}
