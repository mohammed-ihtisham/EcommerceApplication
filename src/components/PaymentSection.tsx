"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCart } from "./CartProvider";
import { useRouter } from "next/navigation";
import ErrorBanner from "./ErrorBanner";

const CREATE_TIMEOUT_MS = 12000;
const POLL_INTERVAL_MS = 2500;
const POLL_GIVE_UP_MS = 60000;

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
  | { phase: "polling"; orderId: string; publicOrderId: string; paymentAttemptId: number }
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

      if (data.status === "ready") {
        setState({
          phase: "ready",
          orderId: data.orderId,
          checkoutId: data.checkoutId,
          paymentAttemptId: data.paymentAttemptId,
        });
        return;
      }

      if (data.status === "pending") {
        setState({
          phase: "polling",
          orderId: data.orderId,
          publicOrderId: data.publicOrderId,
          paymentAttemptId: data.paymentAttemptId,
        });
        return;
      }

      setState({
        phase: "error",
        message: "Something went wrong. Please try again.",
        retryable: true,
      });
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

  // Poll for checkout ready when deferred (webhook or next poll may deliver checkoutId)
  useEffect(() => {
    if (state.phase !== "polling") return;

    const orderId = state.orderId;
    let cancelled = false;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled || !mountedRef.current) return;
      if (Date.now() - startedAt > POLL_GIVE_UP_MS) {
        setState({
          phase: "error",
          message: "Setup is taking longer than usual. Please try again — no charge has been made.",
          retryable: true,
        });
        return;
      }

      try {
        const res = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(orderId)}`);
        const data = await res.json();

        if (cancelled || !mountedRef.current) return;

        if (data.status === "ready") {
          setState({
            phase: "ready",
            orderId,
            checkoutId: data.checkoutId,
            paymentAttemptId: data.paymentAttemptId,
          });
          return;
        }

        if (data.status === "failed") {
          setState({
            phase: "error",
            message: friendlyCheckoutError(data.message),
            retryable: data.retryable ?? true,
          });
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          setState({
            phase: "error",
            message: "Connection error. Please try again.",
            retryable: true,
          });
        }
      }
    };

    poll();
    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [state.phase, state.phase === "polling" ? state.orderId : ""]);

  async function confirmPayment(orderId: string, paymentAttemptId: number, paymentToken: string, retryCount = 0) {
    setState({ phase: "confirming" });

    const maxConfirmRetries = 2;
    try {
      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentAttemptId, paymentToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        const retryable = data.retryable !== false;
        if (retryable && retryCount < maxConfirmRetries) {
          await new Promise((r) => setTimeout(r, 1500));
          return confirmPayment(orderId, paymentAttemptId, paymentToken, retryCount + 1);
        }
        setState({
          phase: "error",
          message: friendlyCheckoutError(data.error || "Payment confirmation failed"),
          retryable: true,
        });
        return;
      }

      clearCart();
      router.push(`/order/${data.publicOrderId}`);
    } catch {
      if (retryCount < maxConfirmRetries) {
        await new Promise((r) => setTimeout(r, 1500));
        return confirmPayment(orderId, paymentAttemptId, paymentToken, retryCount + 1);
      }
      setState({
        phase: "error",
        message: "Connection error during payment. Your payment may still be processing — check your order status.",
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

      {(state.phase === "creating" || state.phase === "polling") && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="h-5 w-5 shrink-0 animate-spin text-gray-500" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="font-medium">
              {state.phase === "creating" ? "Setting up secure checkout..." : "Preparing your checkout..."}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {state.phase === "creating"
              ? "This usually takes a few seconds. Please wait."
              : "Almost ready. We’ll show the payment form in a moment."}
          </p>
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
        <div className="mt-4 space-y-3">
          <p className="text-xs text-gray-500">No charge has been made. You can try again safely.</p>
          <button
            onClick={createCheckout}
            className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
