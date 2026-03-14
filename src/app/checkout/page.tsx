"use client";

import { useCart } from "@/components/CartProvider";
import CheckoutSummary from "@/components/CheckoutSummary";
import PaymentSection from "@/components/PaymentSection";
import CartDrawer from "@/components/CartDrawer";

export default function CheckoutPage() {
  const { items } = useCart();

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">Add some items before checking out.</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700"
        >
          Browse Collection
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Checkout</h1>
        <CartDrawer />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <CheckoutSummary />
        <PaymentSection />
      </div>
    </>
  );
}
