"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCart } from "./CartProvider";
import { useRouter } from "next/navigation";
import ErrorBanner from "./ErrorBanner";

const CREATE_TIMEOUT_MS = 12000;

function friendlyCheckoutError(message: string, code?: string): string {
  if (code === "deferred") {
    return "Our payment partner is still setting things up. Please try again in a moment.";
  }
  if (code === "fraud" || message.toLowerCase().includes("fraud")) {
    return "We couldn't complete this request. If the problem continues, please contact support.";
  }
  if (code === "503-retry" || message.toLowerCase().includes("retry")) {
    return "Our payment service is busy. Please try again — no charge has been made.";
  }
  if (message.toLowerCase().includes("network") || message.toLowerCase().includes("connection")) {
    return "Connection issue. Please check your internet and try again.";
  }
  return message || "Something went wrong. Please try again.";
}

type CheckoutState =
  | { phase: "idle" }
  | { phase: "creating" }
  | { phase: "error"; message: string; retryable: boolean };

interface PaymentSectionProps {
  variant?: "card" | "inline";
}

export default function PaymentSection({ variant = "card" }: PaymentSectionProps) {
  const { items } = useCart();
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>({ phase: "idle" });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const creatingRef = useRef(false);

  const createCheckout = useCallback(async () => {
    if (items.length === 0) return;
    creatingRef.current = true;
    setState({ phase: "creating" });

    const timeoutId = window.setTimeout(() => {
      if (mountedRef.current && creatingRef.current) {
        creatingRef.current = false;
        setState({
          phase: "error",
          message: "Setup is taking longer than usual. Please try again — no charge has been made.",
          retryable: true,
        });
      }
    }, CREATE_TIMEOUT_MS);

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });

      const data = await res.json();
      clearTimeout(timeoutId);
      creatingRef.current = false;

      if (!res.ok) {
        setState({
          phase: "error",
          message: friendlyCheckoutError(data.error, data.code),
          retryable: data.retryable ?? true,
        });
        return;
      }

      // Navigate to dedicated payment page; it will handle polling/embedding.
      const search = new URLSearchParams({
        orderId: String(data.orderId),
        paymentAttemptId: String(data.paymentAttemptId),
      });
      if (data.checkoutId) {
        search.set("checkoutId", String(data.checkoutId));
      }

      router.push(`/checkout/payment?${search.toString()}`);
    } catch {
      clearTimeout(timeoutId);
      creatingRef.current = false;
      setState({
        phase: "error",
        message: "Connection error. Please check your internet and try again.",
        retryable: true,
      });
    }
  }, [items]);

  const isInline = variant === "inline";
  const wrapperClass = isInline
    ? ""
    : "rounded-xl border border-gray-200 bg-white p-6";

  return (
    <div className={wrapperClass}>
      {!isInline && <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment</h2>}

      {state.phase === "error" && (
        <ErrorBanner
          message={state.message}
          onDismiss={state.retryable ? () => setState({ phase: "idle" }) : undefined}
        />
      )}

      {state.phase === "idle" && (
        <button
          onClick={createCheckout}
          disabled={items.length === 0}
          className={
            isInline
              ? "w-full bg-[#111317] px-6 py-5 text-center text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
              : "w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          }
        >
          {isInline ? "Proceed to Payment  \u2192" : "Proceed to Payment"}
        </button>
      )}

      {state.phase === "creating" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="h-5 w-5 shrink-0 animate-spin text-gray-500" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="font-medium">
              "Setting up secure checkout..."
            </span>
          </div>
          <p className="text-xs text-gray-500">
            This usually takes a few seconds. Please wait.
          </p>
        </div>
      )}

      {state.phase === "error" && state.retryable && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-gray-500">No charge has been made. You can try again safely.</p>
          <button
            onClick={createCheckout}
            className={
              isInline
                ? "w-full bg-[#111317] px-6 py-5 text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-black"
                : "w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            }
          >
            {isInline ? "Try Again  \u2192" : "Try Again"}
          </button>
        </div>
      )}
    </div>
  );
}
