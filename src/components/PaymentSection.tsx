"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCart } from "./CartProvider";
import { useRouter } from "next/navigation";
import ErrorBanner from "./ErrorBanner";

type CheckoutState =
  | { phase: "idle" }
  | { phase: "creating" }
  | { phase: "ready"; orderId: string; checkoutId: string; paymentAttemptId: number }
  | { phase: "confirming" }
  | { phase: "error"; message: string; retryable: boolean };

export default function PaymentSection() {
  const { items, clearCart } = useCart();
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>({ phase: "idle" });
  const embeddedRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const confirmRef = useRef<((orderId: string, paymentAttemptId: number, paymentToken: string) => Promise<void>) | null>(null);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const createCheckout = useCallback(async () => {
    if (items.length === 0) return;
    setState({ phase: "creating" });

    const MAX_CLIENT_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_CLIENT_RETRIES; attempt++) {
      try {
        const res = await fetch("/api/checkout/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setState({
            phase: "ready",
            orderId: data.orderId,
            checkoutId: data.checkoutId,
            paymentAttemptId: data.paymentAttemptId,
          });
          return;
        }

        // If retryable and not last attempt, retry automatically
        if (data.retryable && attempt < MAX_CLIENT_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        setState({
          phase: "error",
          message: data.error || "Failed to create checkout",
          retryable: data.retryable ?? true,
        });
        return;
      } catch {
        if (attempt < MAX_CLIENT_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        setState({
          phase: "error",
          message: "Network error. Please check your connection and try again.",
          retryable: true,
        });
      }
    }
  }, [items]);

  async function confirmPayment(orderId: string, paymentAttemptId: number, paymentToken: string) {
    setState({ phase: "confirming" });

    try {
      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentAttemptId, paymentToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({
          phase: "error",
          message: data.error || "Payment confirmation failed",
          retryable: true,
        });
        return;
      }

      // All terminal or processing states redirect to order page
      clearCart();
      router.push(`/order/${data.publicOrderId}`);
    } catch {
      setState({
        phase: "error",
        message: "Network error during payment. Your payment may still be processing.",
        retryable: true,
      });
    }
  }

  // Keep confirmRef up to date so the SDK callback always calls the latest version
  confirmRef.current = confirmPayment;

  // Render embedded checkout when ready
  useEffect(() => {
    if (state.phase !== "ready" || !embeddedRef.current) return;

    const { orderId, checkoutId, paymentAttemptId } = state;
    let cancelled = false;

    async function renderEmbedded() {
      try {
        const { EmbeddedCheckout } = await import("@henrylabs-interview/payments");
        if (cancelled) return;

        const embedded = new EmbeddedCheckout({ checkoutId });
        embeddedRef.current!.innerHTML = "";

        const containerId = "payment-embed-container";
        const container = document.createElement("div");
        container.id = containerId;
        embeddedRef.current!.appendChild(container);

        await embedded.render(`#${containerId}`, async (paymentToken: string) => {
          // Always proceed with confirmation once a token is received —
          // the token represents a real payment intent from the SDK
          if (confirmRef.current) {
            await confirmRef.current(orderId, paymentAttemptId, paymentToken);
          }
        });
      } catch {
        if (!cancelled && mountedRef.current) {
          setState({
            phase: "error",
            message: "Failed to load payment form. Please try again.",
            retryable: true,
          });
        }
      }
    }

    renderEmbedded();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment</h2>

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
          className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Proceed to Payment
        </button>
      )}

      {state.phase === "creating" && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Setting up secure checkout...
        </div>
      )}

      {state.phase === "ready" && (
        <div ref={embeddedRef} className="min-h-[200px]" />
      )}

      {state.phase === "confirming" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <svg className="h-8 w-8 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-gray-700">Processing your payment securely...</p>
          <p className="text-xs text-gray-400">Please do not close this page</p>
        </div>
      )}

      {state.phase === "error" && state.retryable && (
        <button
          onClick={createCheckout}
          className="mt-3 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
