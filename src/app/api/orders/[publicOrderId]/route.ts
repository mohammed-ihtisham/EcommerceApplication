import { NextRequest, NextResponse } from "next/server";
import { getOrderForStatusPage } from "@/server/services/orderService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ publicOrderId: string }> }
) {
  const { publicOrderId } = await params;

  const order = await getOrderForStatusPage(publicOrderId);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}
