"use client";

import { useEffect, useState, useRef } from "react";
import StatusBadge from "./StatusBadge";
import { formatMoney } from "@/lib/money";

interface OrderData {
  publicOrderId: string;
  status: string;
  currency: string;
  subtotalAmount: number;
  items: {
    productName: string;
    productImage: string;
    unitAmount: number;
    currency: string;
    quantity: number;
    lineTotal: number;
  }[];
  createdAt: string;
}

const STATUS_MESSAGES: Record<string, { title: string; description: string; icon: string }> = {
  paid: {
    title: "Order Confirmed!",
    description: "Your order has been successfully processed.",
    icon: "check",
  },
  payment_processing: {
    title: "Payment Processing",
    description: "Processing your payment securely...",
    icon: "clock",
  },
  payment_failed: {
    title: "Payment Failed",
    description: "We couldn't complete your payment. Please try again.",
    icon: "x",
  },
  fraud_rejected: {
    title: "Payment Rejected",
    description: "Your payment was rejected. Please try another payment method.",
    icon: "x",
  },
};

export default function OrderStatusView({ publicOrderId }: { publicOrderId: string }) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slowProcessing, setSlowProcessing] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${publicOrderId}`);
        if (!res.ok) {
          setError("Order not found");
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        setOrder(data);
        setLoading(false);

        // Poll if still processing
        if (data.status === "payment_processing" || data.status === "pending_payment") {
          pollRef.current = setTimeout(fetchOrder, 5000);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load order status");
          setLoading(false);
        }
      }
    }

    fetchOrder();

    // Show slow processing message after 15s
    slowTimerRef.current = setTimeout(() => {
      if (!cancelled) setSlowProcessing(true);
    }, 15000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [publicOrderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="h-8 w-8 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">{error || "Order not found"}</p>
        <a href="/" className="mt-4 inline-block text-sm font-medium text-gray-900 underline">
          Back to shop
        </a>
      </div>
    );
  }

  const statusInfo = STATUS_MESSAGES[order.status];
  const isProcessing = order.status === "payment_processing" || order.status === "pending_payment";

  return (
    <div className="mx-auto max-w-2xl">
      {/* Status Header */}
      <div className="mb-8 text-center">
        {statusInfo?.icon === "check" && (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {statusInfo?.icon === "clock" && (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        {statusInfo?.icon === "x" && (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900">
          {statusInfo?.title || "Order Status"}
        </h1>
        <p className="mt-2 text-gray-500">
          {statusInfo?.description}
        </p>

        {order.status === "paid" && (
          <p className="mt-2 text-sm font-medium text-gray-700">
            Your confirmation ID is {order.publicOrderId}
          </p>
        )}

        {isProcessing && slowProcessing && (
          <p className="mt-2 text-sm text-amber-600">
            This is taking longer than usual. Your payment may still complete.
          </p>
        )}

        <div className="mt-3">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Order Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Details</h2>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{item.productName}</p>
                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatMoney(item.lineTotal, item.currency)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(order.subtotalAmount, order.currency)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 text-center">
        {(order.status === "payment_failed") && (
          <a
            href="/checkout"
            className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700"
          >
            Try Again
          </a>
        )}
        <a
          href="/"
          className="mt-3 inline-block text-sm font-medium text-gray-500 underline hover:text-gray-700"
        >
          Continue Shopping
        </a>
      </div>
    </div>
  );
}
