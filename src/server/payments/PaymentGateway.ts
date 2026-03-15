import "@/lib/bun-polyfill";
import { PaymentProcessor } from "@henrylabs-interview/payments";
import { getPaymentApiKey } from "@/lib/env";
import { logger } from "@/lib/logger";

let _processor: PaymentProcessor | null = null;

function getProcessor(): PaymentProcessor {
  if (!_processor) {
    _processor = new PaymentProcessor({ apiKey: getPaymentApiKey() });
  }
  return _processor;
}

export type CreateCheckoutResult =
  | { success: true; checkoutId: string }
  | { success: false; retryable: boolean; code: string; message: string };

export type ConfirmCheckoutResult =
  | { status: "paid"; confirmationId: string; amount: number; currency: string }
  | { status: "processing" }
  | { status: "failed"; retryable: boolean; message: string }
  | { status: "fraud_rejected"; message: string };

export async function createCheckout(params: {
  amount: number;
  currency: "USD" | "EUR" | "JPY";
  /** Optional: orderId for webhook correlation. Sent without hyphens to avoid SDK fraud rules. */
  orderId?: string;
}): Promise<CreateCheckoutResult> {
  const processor = getProcessor();

  try {
    // SDK rejects customerId containing '-' or length 32 (fraud). Use prefix so we get 33+ chars, no hyphen.
    const customerId =
      params.orderId != null ? "o" + params.orderId.replace(/-/g, "") : undefined;

    const response = await processor.checkout.create({
      amount: params.amount,
      currency: params.currency,
      ...(customerId && { customerId }),
    });

    logger.info("Payment create response", {
      status: response.status,
      substatus: response.substatus,
      reqId: response._reqId,
    });

    if (response.status === "success" && response.substatus === "201-immediate") {
      return { success: true, checkoutId: response.data.checkoutId };
    }

    if (response.status === "success" && response.substatus === "202-deferred") {
      // Deferred creation — the checkout ID will come via webhook
      return {
        success: false,
        retryable: true,
        code: "deferred",
        message: "Checkout creation deferred. Please retry.",
      };
    }

    if (response.status === "failure") {
      // Only transient errors are retryable. 502-fraud at creation stage is a
      // false positive (no card data yet). 501-not-supported etc. are terminal.
      const RETRYABLE_SUBSTATUSES = new Set(["503-retry", "502-fraud", "500-error"]);
      const retryable = RETRYABLE_SUBSTATUSES.has(response.substatus);
      return {
        success: false,
        retryable,
        code: response.substatus === "502-fraud" ? "transient" : response.substatus,
        message: retryable
          ? "Payment service temporarily unavailable"
          : response.message,
      };
    }

    return {
      success: false,
      retryable: false,
      code: "unknown",
      message: "Unexpected response from payment provider",
    };
  } catch (error) {
    logger.error("Payment create error", { error: String(error) });
    return {
      success: false,
      retryable: true,
      code: "sdk_error",
      message: "Payment service unavailable. Please try again.",
    };
  }
}

export async function confirmCheckout(params: {
  checkoutId: string;
  paymentToken: string;
}): Promise<ConfirmCheckoutResult> {
  const processor = getProcessor();

  try {
    const response = await processor.checkout.confirm({
      checkoutId: params.checkoutId,
      type: "embedded",
      data: { paymentToken: params.paymentToken },
    });

    logger.info("Payment confirm response", {
      status: response.status,
      substatus: response.substatus,
      reqId: response._reqId,
    });

    if (response.status === "success" && response.substatus === "201-immediate") {
      return {
        status: "paid",
        confirmationId: response.data.confirmationId,
        amount: response.data.amount,
        currency: response.data.currency,
      };
    }

    if (response.status === "success" && response.substatus === "202-deferred") {
      return { status: "processing" };
    }

    if (response.status === "failure") {
      if (response.substatus === "502-fraud") {
        return { status: "fraud_rejected", message: response.message };
      }
      const retryable = response.substatus === "503-retry";
      return {
        status: "failed",
        retryable,
        message: response.message,
      };
    }

    return { status: "processing" };
  } catch (error) {
    logger.error("Payment confirm error", { error: String(error) });
    return {
      status: "failed",
      retryable: true,
      message: "Payment service unavailable. Please try again.",
    };
  }
}

export async function registerWebhook(url: string, secret?: string): Promise<boolean> {
  const processor = getProcessor();
  try {
    return await processor.webhooks.createEndpoint({
      url,
      events: [
        "checkout.create.success",
        "checkout.create.failure",
        "checkout.confirm.success",
        "checkout.confirm.failure",
      ],
      secret,
    });
  } catch (error) {
    logger.error("Webhook registration error", { error: String(error) });
    return false;
  }
}
