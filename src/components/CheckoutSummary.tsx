"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { useCurrency } from "./CurrencyProvider";
import { useCartTotals } from "@/hooks/useCartTotals";
import { formatMoney } from "@/lib/money";
import type { SupportedCurrency } from "@/lib/zod";

interface CheckoutSummaryProps {
  editable?: boolean;
  showEditCartLink?: boolean;
  title?: string;
}

export default function CheckoutSummary({
  editable = true,
  showEditCartLink = true,
  title = "Order Summary",
}: CheckoutSummaryProps) {
  const { items, updateQuantity, openCart } = useCart();
  const { formatPrice } = useCurrency();
  const { subtotal, displayCurrency } = useCartTotals();

  if (items.length === 0) return null;

  const shipping = 0;
  const estimatedTax = 0;
  const total = subtotal + shipping + estimatedTax;

  return (
    <div className="border border-gray-200 bg-white p-6 sm:p-8">
      <div className="mb-8 flex items-end justify-between border-b border-gray-100 pb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-900">{title}</h2>
        {showEditCartLink && (
          <button
            type="button"
            onClick={openCart}
            className="text-[11px] font-medium text-gray-500 underline underline-offset-4 transition-colors hover:text-gray-900"
          >
            Edit Cart
          </button>
        )}
      </div>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.productId} className="flex gap-5">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-[#F9F9F9] border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imgUrl}
                alt={item.name}
                className="absolute inset-0 h-full w-full object-contain p-2 mix-blend-multiply"
              />
            </div>

            <div className="flex flex-1 flex-col justify-center min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-gray-900">{item.name}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Unit {formatPrice(item.amount, item.currency as SupportedCurrency)}
                  </p>
                </div>
                <span className="text-base font-medium text-gray-900">
                  {formatPrice(item.amount * item.quantity, item.currency as SupportedCurrency)}
                </span>
              </div>

              {editable ? (
                <div className="mt-4 inline-flex w-fit items-center border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="flex h-7 w-8 items-center justify-center text-lg leading-none text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    aria-label={`Decrease quantity for ${item.name}`}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isNaN(next)) return;
                      updateQuantity(item.productId, Math.min(Math.max(next, 1), 99));
                    }}
                    className="h-7 w-10 border-x border-gray-200 bg-white text-center text-xs font-medium tabular-nums text-gray-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="flex h-7 w-8 items-center justify-center text-lg leading-none text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    aria-label={`Increase quantity for ${item.name}`}
                  >
                    +
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs uppercase tracking-wider text-gray-500">
                  Qty {item.quantity}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="text-gray-900">{formatMoney(subtotal, displayCurrency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span className="text-gray-900">{formatMoney(shipping, displayCurrency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Estimated Tax</span>
            <span className="text-gray-900">{formatMoney(estimatedTax, displayCurrency)}</span>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-5">
          <div className="flex items-end justify-between">
            <span className="text-sm font-bold uppercase tracking-widest text-gray-900">Total</span>
            <span className="text-2xl font-semibold tracking-tight text-gray-900">
              {formatMoney(total, displayCurrency)}
            </span>
          </div>
        </div>

        <div className="mt-2" />
      </div>
    </div>
  );
}