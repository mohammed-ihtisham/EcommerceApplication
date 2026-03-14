"use client";

import { useCart } from "./CartProvider";
import { formatMoney } from "@/lib/money";

export default function CheckoutSummary() {
  const { items, subtotal, currency } = useCart();

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imgUrl}
                alt={item.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {formatMoney(item.amount * item.quantity, item.currency)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{currency ? formatMoney(subtotal, currency) : ""}</span>
        </div>
      </div>
    </div>
  );
}
