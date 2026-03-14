import { NextRequest, NextResponse } from "next/server";
import { getCheckoutStatus } from "@/server/services/paymentService";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const result = await getCheckoutStatus(orderId);
  return NextResponse.json(result);
}
