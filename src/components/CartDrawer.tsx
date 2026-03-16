"use client";

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
  const { items, totalItems, subtotal, currency, clearCart, isCartOpen, openCart, closeCart } =
    useCart();
  const router = useRouter();

  return (
    <>
      {/* Cart button */}
      <button
        onClick={openCart}
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
      {isCartOpen && (
        <div
          className="fixed inset-0 z-40 bg-gradient-to-l from-black/40 via-black/30 to-black/10 backdrop-blur-sm transition-opacity"
          onClick={closeCart}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform overflow-hidden rounded-l-[2rem] bg-white/95 shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          
          {/* Header - Always anchored to top */}
          <div className="flex items-start justify-between px-6 pt-8 pb-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-gray-900">
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
              onClick={closeCart}
              className="ml-4 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-50 text-gray-400 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Items / Empty State Area */}
          <div className="flex flex-1 flex-col overflow-y-auto px-6">
            {items.length === 0 ? (
              /* Empty State Container - Centered */
              <div className="flex h-full flex-1 flex-col items-center justify-center pb-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                  <AiOutlineShopping className="h-8 w-8" aria-hidden />
                </div>
                <div className="mb-8 space-y-1.5">
                  <p className="text-base font-medium text-gray-900">
                    Your cart is feeling light
                  </p>
                  <p className="text-sm text-gray-500">
                    Browse the collection and add your favorite pairs.
                  </p>
                </div>
                <button
                  onClick={closeCart}
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-8 py-3 text-xs font-semibold uppercase tracking-wider text-gray-900 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow focus-visible:outline-none"
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              /* Populated Cart Items */
              <div className="py-4 space-y-4">
                {items.map((item) => (
                  <CartItemRow key={item.productId} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Footer - Only shows when items > 0 */}
          {items.length > 0 && (
            <div className="border-t border-gray-100 bg-white/90 px-6 pb-6 pt-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">
                  Subtotal
                </span>
                <span className="text-base font-semibold text-gray-900">
                  {currency ? formatMoney(subtotal, currency) : ""}
                </span>
              </div>
              <p className="mb-4 text-xs text-gray-500">
                Taxes and shipping calculated at checkout.
              </p>
              <button
                onClick={() => {
                  closeCart();
                  router.push("/checkout");
                }}
                className="w-full cursor-pointer rounded-full bg-gray-900 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Checkout
              </button>
              <button
                onClick={clearCart}
                className="mt-3 w-full cursor-pointer rounded-full border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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