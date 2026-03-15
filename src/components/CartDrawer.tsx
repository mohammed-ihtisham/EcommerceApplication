"use client";

import { useState } from "react";
import { AiOutlineShopping } from "react-icons/ai";
import { useCart } from "./CartProvider";
import CartItemRow from "./CartItemRow";
import { formatMoney } from "@/lib/money";
import { useRouter } from "next/navigation";

export default function CartDrawer({
  variant = "default",
}: {
  variant?: "default" | "header";
}) {
  const { items, totalItems, subtotal, currency, clearCart } = useCart();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {/* Cart button */}
      <button
        onClick={() => setOpen(true)}
        className={
          variant === "header"
            ? "cursor-pointer text-xs font-medium uppercase tracking-wide text-gray-900 transition-colors"
            : "relative cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        }
      >
        {variant === "header" ? (
          <span className="flex h-6 items-center gap-1.5">
            <span className="flex h-6 items-center text-xs">CART</span>
            <span className="relative flex h-6 shrink-0 -translate-y-0.5 items-center justify-center">
              <AiOutlineShopping className="h-6 w-6" aria-hidden />
              <span className="absolute -right-1 top-0 flex h-3 w-3 min-w-3 items-center justify-center rounded-full bg-gray-900 text-[8px] font-bold leading-none text-white">
                {totalItems}
              </span>
            </span>
          </span>
        ) : (
          "Cart"
        )}
        {variant === "default" && totalItems > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
            {totalItems}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-gradient-to-l from-black/40 via-black/30 to-black/10 backdrop-blur-sm transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-white/95 shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out sm:rounded-l-3xl ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">
                  Your Cart
                </h2>
                <span className="inline-flex items-center rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-medium text-white">
                  {totalItems} item{totalItems === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Review your picks and checkout in seconds.
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-4 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-500 shadow-sm transition-colors hover:bg-gray-200 hover:text-gray-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <AiOutlineShopping className="h-6 w-6" aria-hidden />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    Your cart is feeling light
                  </p>
                  <p className="text-xs text-gray-500">
                    Browse the collection and add your favorite pairs.
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-gray-800"
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              items.map((item) => <CartItemRow key={item.productId} item={item} />)
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-100 bg-white/90 px-6 pb-5 pt-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-base font-semibold text-gray-900">
                  Subtotal
                </span>
                <span className="text-base font-semibold text-gray-900">
                  {currency ? formatMoney(subtotal, currency) : ""}
                </span>
              </div>
              <p className="mt-1 mb-3 text-[11px] text-gray-500">
                Taxes and shipping calculated at checkout.
              </p>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/checkout");
                }}
                className="w-full cursor-pointer rounded-full bg-gray-900 py-3 text-sm font-medium text-white shadow-md transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Checkout
              </button>
              <button
                onClick={clearCart}
                className="mt-2 w-full cursor-pointer rounded-full border border-gray-200 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Clear cart
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
