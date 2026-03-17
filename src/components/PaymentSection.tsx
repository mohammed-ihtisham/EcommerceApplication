"use client";

import { useCart } from "./CartProvider";
import { useRouter } from "next/navigation";

interface PaymentSectionProps {
  variant?: "card" | "inline";
}

export default function PaymentSection({ variant = "card" }: PaymentSectionProps) {
  const { items } = useCart();
  const router = useRouter();

  const isInline = variant === "inline";
  const wrapperClass = isInline
    ? ""
    : "rounded-xl border border-gray-200 bg-white p-6";

  return (
    <div className={wrapperClass}>
      {!isInline && <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment</h2>}
      <button
        onClick={() => router.push("/checkout/payment")}
        disabled={items.length === 0}
        className={
          isInline
            ? "w-full bg-[#111317] px-6 py-5 text-center text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
            : "w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        }
      >
        {isInline ? "Proceed to Payment  \u2192" : "Proceed to Payment"}
      </button>
    </div>
  );
}
