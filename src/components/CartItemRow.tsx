"use client";

import { useCart, type CartItemData } from "./CartProvider";
import { formatMoney } from "@/lib/money";

export default function CartItemRow({ item }: { item: CartItemData }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex items-center gap-4 border-b border-gray-100 py-4">
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imgUrl}
          alt={item.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="truncate text-sm font-medium text-gray-900">{item.name}</h4>
        <p className="text-sm text-gray-500">
          {formatMoney(item.amount, item.currency)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          -
        </button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          +
        </button>
      </div>
      <span className="w-20 text-right text-sm font-medium text-gray-900">
        {formatMoney(item.amount * item.quantity, item.currency)}
      </span>
      <button
        onClick={() => removeItem(item.productId)}
        className="text-gray-400 hover:text-red-500"
        aria-label={`Remove ${item.name}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
