/**
 * Integration-style tests for the full checkout flow.
 * These test the service layer interactions with mocked DB and payment gateway.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock Prisma ---
const orders: Record<string, any> = {};
const paymentAttempts: Record<number, any> = {};
let nextPaymentId = 1;

function resetDb() {
  for (const key of Object.keys(orders)) delete orders[key];
  for (const key of Object.keys(paymentAttempts))
    delete paymentAttempts[Number(key)];
  nextPaymentId = 1;
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      create: vi.fn(async ({ data, include }: any) => {
        const paData = data.paymentAttempts?.create;
        const paId = nextPaymentId++;
        const pa = {
          id: paId,
          orderId: data.id,
          status: paData?.status ?? "created",
          providerCheckoutId: paData?.providerCheckoutId ?? null,
          idempotencyKey: paData?.idempotencyKey ?? "idk",
          amount: paData?.amount ?? data.subtotalAmount,
          currency: paData?.currency ?? data.currency,
          version: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          failureCode: null,
          failureMessage: null,
          providerPaymentId: null,
        };
        paymentAttempts[paId] = pa;

        const items = (data.items?.create ?? []).map((item: any, i: number) => ({
          id: i + 1,
          orderId: data.id,
          ...item,
        }));

        const order = {
          id: data.id,
          publicOrderId: data.publicOrderId,
          status: data.status,
          currency: data.currency,
          subtotalAmount: data.subtotalAmount,
          exchangeRateSnapshot: data.exchangeRateSnapshot,
          version: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          items,
          paymentAttempts: [pa],
        };
        orders[data.id] = order;
        return order;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return orders[where.id] ?? null;
        if (where.publicOrderId) {
          return (
            Object.values(orders).find(
              (o: any) => o.publicOrderId === where.publicOrderId
            ) ?? null
          );
        }
        return null;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const order = orders[where.id];
        if (!order || order.version !== where.version) return { count: 0 };
        if (data.status) order.status = data.status;
        if (data.version?.increment) order.version += data.version.increment;
        return { count: 1 };
      }),
    },
    paymentAttempt: {
      findUnique: vi.fn(async ({ where, include }: any) => {
        const pa = paymentAttempts[where.id];
        if (!pa) return null;
        if (include?.order) {
          return { ...pa, order: orders[pa.orderId] };
        }
        return pa;
      }),
      findFirst: vi.fn(async ({ where, include }: any) => {
        const match = Object.values(paymentAttempts).find((pa: any) => {
          if (where.providerCheckoutId)
            return pa.providerCheckoutId === where.providerCheckoutId;
          if (where.orderId) return pa.orderId === where.orderId;
          return false;
        });
        if (!match) return null;
        if (include?.order) {
          return { ...match, order: orders[(match as any).orderId] };
        }
        return match;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const pa = paymentAttempts[where.id];
        if (!pa) return null;
        Object.assign(pa, data);
        return pa;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const pa = paymentAttempts[where.id];
        if (!pa || pa.version !== where.version) return { count: 0 };
        if (data.status) pa.status = data.status;
        if (data.providerCheckoutId)
          pa.providerCheckoutId = data.providerCheckoutId;
        if (data.providerPaymentId)
          pa.providerPaymentId = data.providerPaymentId;
        if (data.failureCode) pa.failureCode = data.failureCode;
        if (data.failureMessage) pa.failureMessage = data.failureMessage;
        if (data.version?.increment) pa.version += data.version.increment;
        return { count: 1 };
      }),
    },
    webhookEvent: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
    },
    $transaction: vi.fn(async (fn: any) => fn({
      paymentAttempt: {
        findUnique: async ({ where }: any) => paymentAttempts[where.id] ?? null,
        updateMany: async ({ where, data }: any) => {
          const pa = paymentAttempts[where.id];
          if (!pa || pa.version !== where.version) return { count: 0 };
          if (data.status) pa.status = data.status;
          if (data.providerCheckoutId)
            pa.providerCheckoutId = data.providerCheckoutId;
          if (data.providerPaymentId)
            pa.providerPaymentId = data.providerPaymentId;
          if (data.failureCode) pa.failureCode = data.failureCode;
          if (data.failureMessage) pa.failureMessage = data.failureMessage;
          if (data.version?.increment) pa.version += data.version.increment;
          return { count: 1 };
        },
      },
      order: {
        findUnique: async ({ where }: any) => orders[where.id] ?? null,
        updateMany: async ({ where, data }: any) => {
          const order = orders[where.id];
          if (!order || order.version !== where.version) return { count: 0 };
          if (data.status) order.status = data.status;
          if (data.version?.increment)
            order.version += data.version.increment;
          return { count: 1 };
        },
      },
    })),
  },
}));

// --- Mock Payment Gateway ---
const mockCreateCheckout = vi.fn();
const mockConfirmCheckout = vi.fn();

vi.mock("@/server/payments/PaymentGateway", () => ({
  createCheckout: (...args: unknown[]) => mockCreateCheckout(...args),
  confirmCheckout: (...args: unknown[]) => mockConfirmCheckout(...args),
}));

// Mock retry to be instant
vi.mock("@/server/payments/retry", () => ({
  retryWithBackoff: async (
    fn: () => Promise<unknown>,
    options: {
      shouldRetry: (r: unknown) => boolean;
      maxRetries?: number;
      onRetry?: (a: number, r: unknown) => void;
    }
  ) => {
    const maxRetries = options.maxRetries ?? 3;
    let result = await fn();
    for (let i = 1; i <= maxRetries; i++) {
      if (!options.shouldRetry(result)) return result;
      options.onRetry?.(i, result);
      result = await fn();
    }
    return result;
  },
}));

// --- Import services after mocks ---
import { validateCart } from "@/server/services/cartService";
import { createOrder } from "@/server/services/orderService";
import {
  initiateCheckoutPayment,
  confirmCheckoutPayment,
} from "@/server/services/paymentService";

const RATES = { USD: 1, EUR: 0.92, JPY: 149.5 };

describe("Integration: Checkout Flow", () => {
  beforeEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  it("create order from cart -> create checkout -> confirm success", async () => {
    // Step 1: Validate cart
    const cart = validateCart(
      [{ productId: 1, quantity: 2 }],
      "USD",
      RATES
    );
    expect("error" in cart).toBe(false);
    if ("error" in cart) return;
    expect(cart.items).toHaveLength(1);
    expect(cart.chargeSubtotal).toBe(6500); // 3250 * 2

    // Step 2: Create order in DB
    const order = await createOrder(cart, RATES);
    expect(order.publicOrderId).toMatch(/^VIR-/);
    expect(order.status).toBe("checkout_draft");
    expect(order.items).toHaveLength(1);
    expect(order.paymentAttempts).toHaveLength(1);

    // Step 3: Initiate checkout with payment provider
    mockCreateCheckout.mockResolvedValue({
      success: true,
      checkoutId: "chk_integration_123",
    });

    const paymentResult = await initiateCheckoutPayment(order.id);
    expect(paymentResult.success).toBe(true);
    if (!paymentResult.success) return;
    expect(paymentResult.checkoutId).toBe("chk_integration_123");

    // Verify DB state after checkout creation
    expect(orders[order.id].status).toBe("pending_payment");
    expect(paymentAttempts[1].providerCheckoutId).toBe("chk_integration_123");

    // Step 4: Confirm payment
    mockConfirmCheckout.mockResolvedValue({
      status: "paid",
      confirmationId: "conf_integration_456",
      amount: 6500,
      currency: "USD",
    });

    const confirmResult = await confirmCheckoutPayment(
      order.id,
      paymentResult.paymentAttemptId,
      "tok_test_123"
    );
    expect(confirmResult.status).toBe("paid");

    // Verify final DB state
    expect(orders[order.id].status).toBe("paid");
    expect(paymentAttempts[1].status).toBe("succeeded");
    expect(paymentAttempts[1].providerPaymentId).toBe(
      "conf_integration_456"
    );
  });

  it("create order -> confirm failure flow", async () => {
    const cart = validateCart(
      [{ productId: 1, quantity: 1 }],
      "USD",
      RATES
    );
    if ("error" in cart) return;

    const order = await createOrder(cart, RATES);

    mockCreateCheckout.mockResolvedValue({
      success: true,
      checkoutId: "chk_fail_test",
    });
    await initiateCheckoutPayment(order.id);

    // Confirm returns non-retryable failure
    mockConfirmCheckout.mockResolvedValue({
      status: "failed",
      retryable: false,
      message: "Insufficient funds",
    });

    const confirmResult = await confirmCheckoutPayment(
      order.id,
      1,
      "tok_test"
    );
    expect(confirmResult.status).toBe("failed");

    // Verify DB: order failed, payment failed
    expect(orders[order.id].status).toBe("payment_failed");
    expect(paymentAttempts[1].status).toBe("failed");
  });

  it("create order -> confirm fraud rejection", async () => {
    const cart = validateCart(
      [{ productId: 2, quantity: 1 }],
      "USD",
      RATES
    );
    if ("error" in cart) return;

    const order = await createOrder(cart, RATES);

    mockCreateCheckout.mockResolvedValue({
      success: true,
      checkoutId: "chk_fraud_test",
    });
    await initiateCheckoutPayment(order.id);

    mockConfirmCheckout.mockResolvedValue({
      status: "fraud_rejected",
      message: "Suspected fraud",
    });

    const confirmResult = await confirmCheckoutPayment(
      order.id,
      1,
      "tok_test"
    );
    expect(confirmResult.status).toBe("fraud_rejected");
    expect(orders[order.id].status).toBe("fraud_rejected");
    expect(paymentAttempts[1].status).toBe("fraud_rejected");
  });

  it("create order -> confirm deferred (processing) -> webhook resolves to paid", async () => {
    const cart = validateCart(
      [{ productId: 1, quantity: 1 }],
      "USD",
      RATES
    );
    if ("error" in cart) return;

    const order = await createOrder(cart, RATES);

    mockCreateCheckout.mockResolvedValue({
      success: true,
      checkoutId: "chk_deferred",
    });
    await initiateCheckoutPayment(order.id);

    // Confirm returns processing (deferred)
    mockConfirmCheckout.mockResolvedValue({
      status: "processing",
    });

    const confirmResult = await confirmCheckoutPayment(
      order.id,
      1,
      "tok_test"
    );
    expect(confirmResult.status).toBe("processing");
    expect(orders[order.id].status).toBe("payment_processing");
    expect(paymentAttempts[1].status).toBe("processing");

    // Now simulate webhook resolving to paid
    // Import the webhook dependencies
    const { updatePaymentAndOrderStatus } = await import(
      "@/server/orders/orderQueries"
    );

    await updatePaymentAndOrderStatus(1, "succeeded", order.id, "paid", {
      providerPaymentId: "conf_webhook_789",
    });

    expect(orders[order.id].status).toBe("paid");
    expect(paymentAttempts[1].status).toBe("succeeded");
  });

  it("duplicate pay click: second confirm is rejected", async () => {
    const cart = validateCart(
      [{ productId: 1, quantity: 1 }],
      "USD",
      RATES
    );
    if ("error" in cart) return;

    const order = await createOrder(cart, RATES);

    mockCreateCheckout.mockResolvedValue({
      success: true,
      checkoutId: "chk_dup",
    });
    await initiateCheckoutPayment(order.id);

    // First confirm succeeds
    mockConfirmCheckout.mockResolvedValue({
      status: "paid",
      confirmationId: "conf_first",
      amount: 3250,
      currency: "USD",
    });

    const first = await confirmCheckoutPayment(order.id, 1, "tok_1");
    expect(first.status).toBe("paid");

    // Second confirm on already-paid order
    const second = await confirmCheckoutPayment(order.id, 1, "tok_2");
    expect(second.status).toBe("already_paid");

    // Gateway should only be called once
    expect(mockConfirmCheckout).toHaveBeenCalledTimes(1);
  });

  it("idempotent checkout: calling initiate twice returns same checkoutId", async () => {
    const cart = validateCart(
      [{ productId: 1, quantity: 1 }],
      "USD",
      RATES
    );
    if ("error" in cart) return;

    const order = await createOrder(cart, RATES);

    mockCreateCheckout.mockResolvedValue({
      success: true,
      checkoutId: "chk_idempotent",
    });

    const first = await initiateCheckoutPayment(order.id);
    expect(first.success).toBe(true);

    // Second call should not hit the gateway
    const second = await initiateCheckoutPayment(order.id);
    expect(second.success).toBe(true);
    if (second.success) {
      expect(second.checkoutId).toBe("chk_idempotent");
    }

    // Gateway called only once
    expect(mockCreateCheckout).toHaveBeenCalledTimes(1);
  });
});
