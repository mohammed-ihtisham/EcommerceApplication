"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import CartItemRow from "./CartItemRow";
import { formatMoney } from "@/lib/money";
import { useRouter } from "next/navigation";

export default function CartDrawer() {
  const { items, totalItems, subtotal, currency, clearCart } = useCart();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {/* Cart button */}
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
      >
        Cart
        {totalItems > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
            {totalItems}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold">Your Cart ({totalItems})</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-6">
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-400">
                Your cart is empty
              </div>
            ) : (
              items.map((item) => <CartItemRow key={item.productId} item={item} />)
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="mb-4 flex items-center justify-between text-base font-semibold">
                <span>Subtotal</span>
                <span>{currency ? formatMoney(subtotal, currency) : ""}</span>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/checkout");
                }}
                className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                Checkout
              </button>
              <button
                onClick={clearCart}
                className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
