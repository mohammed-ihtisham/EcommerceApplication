"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import ErrorBanner from "@/components/ErrorBanner";
import Link from "next/link";
import Image from "next/image";

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

type PaymentPageState =
  | { phase: "initializing" }
  | { phase: "polling"; orderId: string; paymentAttemptId: number }
  | { phase: "ready"; orderId: string; checkoutId: string; paymentAttemptId: number }
  | { phase: "confirming" }
  | { phase: "error"; message: string; retryable: boolean };

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | null;

function detectCardBrand(raw: string): CardBrand {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Visa: 4
  if (digits.startsWith("4")) return "visa";

  // Amex: 34, 37
  if (digits.startsWith("34") || digits.startsWith("37")) return "amex";

  // Mastercard: 51-55, 2221-2720
  const first2 = Number(digits.slice(0, 2));
  if (digits.length >= 2 && first2 >= 51 && first2 <= 55) return "mastercard";
  const first4 = Number(digits.slice(0, 4));
  if (digits.length >= 4 && first4 >= 2221 && first4 <= 2720) return "mastercard";

  // Discover: 6011, 65, 644-649, 622126-622925
  if (digits.startsWith("6011") || digits.startsWith("65")) return "discover";
  const first3 = Number(digits.slice(0, 3));
  if (digits.length >= 3 && first3 >= 644 && first3 <= 649) return "discover";
  const first6 = Number(digits.slice(0, 6));
  if (digits.length >= 6 && first6 >= 622126 && first6 <= 622925) return "discover";

  return null;
}

export default function CheckoutPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();

  const [state, setState] = useState<PaymentPageState>({ phase: "initializing" });
  const [detectedBrand, setDetectedBrand] = useState<CardBrand>(null);
  const embeddedRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const confirmRef = useRef<
    ((orderId: string, paymentAttemptId: number, paymentToken: string) => Promise<void>) | null
  >(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Bootstrap from URL params
  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const paymentAttemptIdParam = searchParams.get("paymentAttemptId");
    const checkoutId = searchParams.get("checkoutId");

    if (!orderId || !paymentAttemptIdParam) {
      setState({
        phase: "error",
        message: "Missing payment details. Please return to checkout and try again.",
        retryable: false,
      });
      return;
    }

    const paymentAttemptId = Number(paymentAttemptIdParam);
    if (Number.isNaN(paymentAttemptId)) {
      setState({
        phase: "error",
        message: "Invalid payment information. Please return to checkout and try again.",
        retryable: false,
      });
      return;
    }

    if (checkoutId) {
      setState({ phase: "ready", orderId, checkoutId, paymentAttemptId });
    } else {
      setState({ phase: "polling", orderId, paymentAttemptId });
    }
  }, [searchParams]);

  // Poll for checkout ready when we only have orderId/paymentAttemptId
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

  const confirmPayment = useCallback(
    async (orderId: string, paymentAttemptId: number, paymentToken: string, retryCount = 0) => {
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
          message:
            "Connection error during payment. Your payment may still be processing — check your order status.",
          retryable: true,
        });
      }
    },
    [clearCart, router],
  );

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
        setDetectedBrand(null);

        const containerId = "payment-embed-container";
        const container = document.createElement("div");
        container.id = containerId;
        embeddedRef.current!.appendChild(container);

        await embedded.render(`#${containerId}`, async (paymentToken: string) => {
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
    return () => {
      cancelled = true;
    };
  }, [state.phase]);

  // Detect card brand while typing (only works if SDK is not iframe-based).
  useEffect(() => {
    if (state.phase !== "ready" && state.phase !== "confirming") return;

    let cleanup = () => {};
    let cancelled = false;

    const attach = () => {
      const root = document.getElementById("payment-embed-container");
      if (!root) return false;

      const candidates = Array.from(root.querySelectorAll("input"));
      const ccNumber =
        candidates.find((el) => (el as HTMLInputElement).autocomplete === "cc-number") ||
        candidates.find((el) => {
          const input = el as HTMLInputElement;
          const name = (input.getAttribute("name") || "").toLowerCase();
          const placeholder = (input.getAttribute("placeholder") || "").toLowerCase();
          const aria = (input.getAttribute("aria-label") || "").toLowerCase();
          return (
            name.includes("card") ||
            placeholder.includes("card number") ||
            aria.includes("card number")
          );
        });

      if (!ccNumber) return false;

      const handler = (e: Event) => {
        const value = (e.target as HTMLInputElement | null)?.value ?? "";
        if (cancelled) return;
        setDetectedBrand(detectCardBrand(value));
      };

      ccNumber.addEventListener("input", handler, { passive: true });
      handler({ target: ccNumber } as unknown as Event);

      cleanup = () => {
        ccNumber.removeEventListener("input", handler);
      };
      return true;
    };

    // Try now, otherwise observe until SDK inserts inputs.
    if (!attach()) {
      const host = embeddedRef.current;
      if (host) {
        const obs = new MutationObserver(() => {
          if (attach()) obs.disconnect();
        });
        obs.observe(host, { subtree: true, childList: true });
        cleanup = () => obs.disconnect();
      }
    }

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [state.phase]);

  const showSpinner =
    state.phase === "initializing" || state.phase === "polling";

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
              <Link href="/checkout" className="transition-colors hover:text-gray-900">
                Checkout
              </Link>
              <span>/</span>
              <span className="text-gray-900">Payment</span>
            </div>

            <h1 className="font-serif text-3xl tracking-wide text-gray-900 sm:text-4xl">
              PAYMENT
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Securely complete your order. Your card details are encrypted and never stored on our
              servers.
            </p>
          </div>
        </div>
      </div>

      <main
        className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-6 py-8 sm:px-8 lg:py-12"
        data-detected-brand={detectedBrand ?? ""}
      >
        {state.phase === "error" && (
          <ErrorBanner
            message={state.message}
            onDismiss={
              state.retryable
                ? () => {
                    setState({ phase: "initializing" });
                    router.push("/checkout");
                  }
                : undefined
            }
          />
        )}

        {/* --- CARD LOGOS ROW --- */}
        <div className="flex items-center justify-center gap-2">
          {/* Visa */}
          <div
            data-brand="visa"
            className="flex h-9 w-14 items-center justify-center rounded-md border border-gray-200 bg-[#F8F9F8] shadow-sm transition-colors"
          >
            <div className="relative h-5 w-10">
              <Image
                src="/payment-cards/visa.svg"
                alt="Visa"
                fill
                className="object-contain"
                sizes="40px"
                priority
              />
            </div>
          </div>
          {/* Mastercard */}
          <div
            data-brand="mastercard"
            className="flex h-9 w-14 items-center justify-center rounded-md border border-gray-200 bg-[#F8F9F8] shadow-sm transition-colors"
          >
            <div className="relative h-5 w-10">
              <Image
                src="/payment-cards/mastercard.png"
                alt="Mastercard"
                fill
                className="object-contain scale-[1.18]"
                sizes="40px"
                priority
              />
            </div>
          </div>
          {/* Amex */}
          <div
            data-brand="amex"
            className="flex h-9 w-14 items-center justify-center rounded-md border border-gray-200 bg-[#F8F9F8] shadow-sm transition-colors"
          >
            <div className="relative h-5 w-10">
              <Image
                src="/payment-cards/amex.svg"
                alt="American Express"
                fill
                className="object-contain scale-[1.22]"
                sizes="40px"
                priority
              />
            </div>
          </div>
          {/* Discover */}
          <div
            data-brand="discover"
            className="flex h-9 w-14 items-center justify-center rounded-md border border-gray-200 bg-[#F8F9F8] shadow-sm transition-colors"
          >
            <div className="relative h-5 w-10">
              <Image
                src="/payment-cards/discover.jpg"
                alt="Discover"
                fill
                className="object-contain scale-[1.28]"
                sizes="40px"
                priority
              />
            </div>
          </div>
        </div>
        {/* ---------------------- */}

        {/* Transparent Wrapper - No background or borders, letting the SDK card breathe */}
        <div className="relative flex min-h-[340px] w-full flex-col justify-center">
          
          {showSpinner && (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="h-px w-12 animate-pulse bg-gray-300"></div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                {state.phase === "polling"
                  ? "Preparing Secure Checkout..."
                  : "Initializing..."}
              </p>
            </div>
          )}

          <div
            className={`w-full transition-opacity duration-500 ${
              state.phase === "ready" || state.phase === "confirming" ? "opacity-100" : "absolute opacity-0 pointer-events-none"
            }`}
          >
            {/* The SDK will mount its own card inside here */}
            <div className="flex w-full justify-center">
              <div ref={embeddedRef} className="w-full max-w-[420px]" />
            </div>
          </div>

          {/* Sleek Confirming Overlay - Matches the background and blurs the SDK card */}
          {state.phase === "confirming" && (
            <div className="absolute inset-0 z-10 overflow-hidden rounded-2xl bg-white/55 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 opacity-80">
                <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-black/10 via-transparent to-transparent blur-2xl" />
                <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-tr from-black/5 via-transparent to-transparent blur-3xl" />
              </div>

              <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden bg-black/5">
                <div className="h-full w-1/3 animate-[paymentShimmer_1.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-black/25 to-transparent" />
              </div>

              <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="flex items-center gap-3">
                  <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/70 shadow-[0_12px_30px_rgba(17,19,23,0.10)]">
                    <span className="absolute h-10 w-10 animate-[paymentSpin_1s_linear_infinite] rounded-full border border-black/15 border-t-black/60" />
                    <span className="absolute h-7 w-7 animate-[paymentSpin_1.4s_linear_infinite_reverse] rounded-full border border-black/10 border-b-black/40" />
                  </span>
                </div>

                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-900">
                  Processing payment
                </p>
                <p className="mt-2 max-w-[32ch] text-[11px] leading-relaxed text-gray-500">
                  Don’t refresh or close this tab. This usually takes a few seconds.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        /* Some SDK versions render a fixed-width card without auto-centering. */
        #payment-embed-container {
          display: flex;
          justify-content: center;
        }

        #payment-embed-container > * {
          margin-inline: auto !important;
        }

        /* Highlight detected card brand in logo row. */
        main[data-detected-brand="visa"] [data-brand="visa"],
        main[data-detected-brand="mastercard"] [data-brand="mastercard"],
        main[data-detected-brand="amex"] [data-brand="amex"],
        main[data-detected-brand="discover"] [data-brand="discover"] {
          border-color: #111317 !important;
        }

        @keyframes paymentSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes paymentShimmer {
          0% {
            transform: translateX(-40%);
          }
          100% {
            transform: translateX(220%);
          }
        }
      `}</style>
    </div>
  );
}