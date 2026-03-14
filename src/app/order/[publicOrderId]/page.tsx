"use client";

import { use } from "react";
import OrderStatusView from "@/components/OrderStatusView";

export default function OrderPage({ params }: { params: Promise<{ publicOrderId: string }> }) {
  const { publicOrderId } = use(params);

  return <OrderStatusView publicOrderId={publicOrderId} />;
}
