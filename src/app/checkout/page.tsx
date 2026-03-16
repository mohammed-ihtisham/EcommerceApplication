"use client";

import { useCart } from "@/components/CartProvider";
import CheckoutSummary from "@/components/CheckoutSummary";
import PaymentSection from "@/components/PaymentSection";
import Link from "next/link";

export default function CheckoutPage() {
  const { items } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 h-[1px] w-12 bg-gray-300" />
        <h1 className="font-serif text-2xl tracking-tight text-gray-900">Your cart is empty</h1>
        <p className="mt-4 text-sm text-gray-500">Discover pieces that define your style.</p>
        <Link
          href="/"
          className="mt-10 border border-black bg-black px-10 py-4 text-[10px] font-bold tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-black"
        >
          SHOP NEW ARRIVALS
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900">
      <div className="border-b border-gray-200 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[960px] px-6 py-6 sm:px-8 lg:px-10">
          <div className="-ml-1 sm:-ml-2">
            <div className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              <Link href="/cart" className="transition-colors hover:text-gray-900">
                Cart
              </Link>
              <span>/</span>
              <span className="text-gray-900">Checkout</span>
              <span>/</span>
              <span>Payment</span>
            </div>

            <h1 className="font-serif text-3xl tracking-wide text-gray-900 sm:text-4xl">
              CHECKOUT
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Review your order, then proceed to secure payment.
            </p>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[720px] px-6 py-8 sm:px-8 lg:px-10 lg:py-12">
        <CheckoutSummary editable showEditCartLink />

        <div className="mt-8">
          <PaymentSection variant="inline" />
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8 text-center">
          <p className="text-[11px] leading-relaxed text-gray-400">
            All transactions are encrypted. By completing your order, you agree to our terms and privacy policy.
          </p>
        </div>
      </main>
    </div>
  );
}