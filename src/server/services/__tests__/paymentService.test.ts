import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConcurrentModificationError } from "@/server/orders/orderQueries";

// Mock prisma
const mockFindUniqueOrder = vi.fn();
const mockFindUniquePayment = vi.fn();
const mockUpdatePayment = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: (...args: unknown[]) => mockFindUniqueOrder(...args) },
    paymentAttempt: {
      findUnique: (...args: unknown[]) => mockFindUniquePayment(...args),
      update: (...args: unknown[]) => mockUpdatePayment(...args),
    },
  },
}));

// Mock gateway
const mockCreateCheckout = vi.fn();
const mockConfirmCheckout = vi.fn();

vi.mock("@/server/payments/PaymentGateway", () => ({
  createCheckout: (...args: unknown[]) => mockCreateCheckout(...args),
  confirmCheckout: (...args: unknown[]) => mockConfirmCheckout(...args),
}));

// Mock orderQueries
const mockUpdateOrderStatus = vi.fn();
const mockUpdatePaymentAttemptStatus = vi.fn();
const mockUpdatePaymentAndOrderStatus = vi.fn();

vi.mock("@/server/orders/orderQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/orders/orderQueries")>();
  return {
    ...actual,
    updateOrderStatus: (...args: unknown[]) => mockUpdateOrderStatus(...args),
    updatePaymentAttemptStatus: (...args: unknown[]) => mockUpdatePaymentAttemptStatus(...args),
    updatePaymentAndOrderStatus: (...args: unknown[]) => mockUpdatePaymentAndOrderStatus(...args),
  };
});

// Mock retry to execute immediately (no delays)
vi.mock("@/server/payments/retry", () => ({
  retryWithBackoff: async (fn: () => Promise<unknown>, options: { shouldRetry: (r: unknown) => boolean; maxRetries?: number; onRetry?: (a: number, r: unknown) => void }) => {
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

import {
  initiateCheckoutPayment,
  getCheckoutStatus,
  confirmCheckoutPayment,
} from "../paymentService";

function makeOrder(overrides = {}) {
  return {
    id: "order-uuid",
    publicOrderId: "VIR-ABC123",
    status: "checkout_draft",
    currency: "USD",
    subtotalAmount: 5000,
    version: 0,
    paymentAttempts: [
      {
        id: 1,
        orderId: "order-uuid",
        status: "created",
        providerCheckoutId: null,
        idempotencyKey: "idk-1",
        amount: 5000,
        currency: "USD",
        version: 0,
      },
    ],
    ...overrides,
  };
}

function makePaymentAttempt(overrides = {}) {
  return {
    id: 1,
    orderId: "order-uuid",
    status: "created",
    providerCheckoutId: "chk_123",
    idempotencyKey: "idk-1",
    amount: 5000,
    currency: "USD",
    version: 0,
    order: {
      id: "order-uuid",
      publicOrderId: "VIR-ABC123",
      status: "pending_payment",
      currency: "USD",
      subtotalAmount: 5000,
      version: 1,
    },
    ...overrides,
  };
}

describe("initiateCheckoutPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates checkout successfully", async () => {
    mockFindUniqueOrder.mockResolvedValue(makeOrder());
    mockCreateCheckout.mockResolvedValue({ success: true, checkoutId: "chk_new" });
    mockUpdatePayment.mockResolvedValue({});
    mockUpdateOrderStatus.mockResolvedValue({});

    const result = await initiateCheckoutPayment("order-uuid");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.checkoutId).toBe("chk_new");
      expect(result.paymentAttemptId).toBe(1);
    }
  });

  it("returns existing checkoutId if already created (idempotent)", async () => {
    const order = makeOrder({
      paymentAttempts: [
        {
          id: 1,
          orderId: "order-uuid",
          status: "created",
          providerCheckoutId: "chk_existing",
          idempotencyKey: "idk-1",
          amount: 5000,
          currency: "USD",
          version: 0,
        },
      ],
    });
    mockFindUniqueOrder.mockResolvedValue(order);
    mockUpdateOrderStatus.mockResolvedValue({});

    const result = await initiateCheckoutPayment("order-uuid");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.checkoutId).toBe("chk_existing");
    }
    expect(mockCreateCheckout).not.toHaveBeenCalled();
  });

  it("handles terminal failure from gateway", async () => {
    mockFindUniqueOrder.mockResolvedValue(makeOrder());
    mockCreateCheckout.mockResolvedValue({
      success: false,
      retryable: false,
      code: "501-not-supported",
      message: "Not supported",
    });
    mockUpdatePaymentAttemptStatus.mockResolvedValue({});
    mockUpdateOrderStatus.mockResolvedValue({});

    const result = await initiateCheckoutPayment("order-uuid");
    expect(result.success).toBe(false);
    if (!result.success && "retryable" in result) {
      expect(result.retryable).toBe(false);
    }
  });

  it("returns pending when retries exhausted", async () => {
    mockFindUniqueOrder.mockResolvedValue(makeOrder());
    mockCreateCheckout.mockResolvedValue({
      success: false,
      retryable: true,
      code: "503-retry",
      message: "Retry later",
    });

    const result = await initiateCheckoutPayment("order-uuid");
    expect(result.success).toBe(false);
    if (!result.success && "pending" in result) {
      expect(result.pending).toBe(true);
    }
  });

  it("throws when order not found", async () => {
    mockFindUniqueOrder.mockResolvedValue(null);
    await expect(initiateCheckoutPayment("order-uuid")).rejects.toThrow("Order not found");
  });
});

describe("getCheckoutStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ready when checkoutId exists", async () => {
    mockFindUniqueOrder.mockResolvedValue(
      makeOrder({
        status: "pending_payment",
        paymentAttempts: [{ id: 1, providerCheckoutId: "chk_123" }],
      })
    );

    const result = await getCheckoutStatus("order-uuid");
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.checkoutId).toBe("chk_123");
    }
  });

  it("returns pending when no checkoutId yet", async () => {
    mockFindUniqueOrder.mockResolvedValue(
      makeOrder({
        status: "checkout_draft",
        paymentAttempts: [{ id: 1, providerCheckoutId: null }],
      })
    );

    const result = await getCheckoutStatus("order-uuid");
    expect(result.status).toBe("pending");
  });

  it("returns failed when order not found", async () => {
    mockFindUniqueOrder.mockResolvedValue(null);

    const result = await getCheckoutStatus("order-uuid");
    expect(result.status).toBe("failed");
  });

  it("returns failed for terminal order without checkoutId", async () => {
    mockFindUniqueOrder.mockResolvedValue(
      makeOrder({
        status: "paid",
        paymentAttempts: [{ id: 1, providerCheckoutId: null }],
      })
    );

    const result = await getCheckoutStatus("order-uuid");
    expect(result.status).toBe("failed");
  });
});

describe("confirmCheckoutPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paid on successful confirmation", async () => {
    mockFindUniquePayment.mockResolvedValue(makePaymentAttempt());
    mockConfirmCheckout.mockResolvedValue({
      status: "paid",
      confirmationId: "conf_123",
      amount: 5000,
      currency: "USD",
    });
    mockUpdatePaymentAttemptStatus.mockResolvedValue({});
    mockUpdatePaymentAndOrderStatus.mockResolvedValue({});

    const result = await confirmCheckoutPayment("order-uuid", 1, "tok_abc");
    expect(result.status).toBe("paid");
  });

  it("returns already_paid if order is already paid", async () => {
    mockFindUniquePayment.mockResolvedValue(
      makePaymentAttempt({
        order: {
          id: "order-uuid",
          publicOrderId: "VIR-ABC123",
          status: "paid",
          currency: "USD",
          subtotalAmount: 5000,
          version: 2,
        },
      })
    );

    const result = await confirmCheckoutPayment("order-uuid", 1, "tok_abc");
    expect(result.status).toBe("already_paid");
    expect(mockConfirmCheckout).not.toHaveBeenCalled();
  });

  it("returns fraud_rejected", async () => {
    mockFindUniquePayment.mockResolvedValue(makePaymentAttempt());
    mockConfirmCheckout.mockResolvedValue({
      status: "fraud_rejected",
      message: "Fraud detected",
    });
    mockUpdatePaymentAttemptStatus.mockResolvedValue({});
    mockUpdatePaymentAndOrderStatus.mockResolvedValue({});

    const result = await confirmCheckoutPayment("order-uuid", 1, "tok_abc");
    expect(result.status).toBe("fraud_rejected");
  });

  it("returns processing for deferred confirmation", async () => {
    mockFindUniquePayment.mockResolvedValue(makePaymentAttempt());
    mockConfirmCheckout.mockResolvedValue({ status: "processing" });
    mockUpdatePaymentAttemptStatus.mockResolvedValue({});
    mockUpdatePaymentAndOrderStatus.mockResolvedValue({});

    const result = await confirmCheckoutPayment("order-uuid", 1, "tok_abc");
    expect(result.status).toBe("processing");
  });

  it("throws for invalid payment attempt", async () => {
    mockFindUniquePayment.mockResolvedValue(null);
    await expect(confirmCheckoutPayment("order-uuid", 1, "tok_abc")).rejects.toThrow(
      "Invalid payment attempt"
    );
  });

  it("throws for terminal payment attempt", async () => {
    mockFindUniquePayment.mockResolvedValue(
      makePaymentAttempt({ status: "succeeded" })
    );

    await expect(confirmCheckoutPayment("order-uuid", 1, "tok_abc")).rejects.toThrow(
      "terminal state"
    );
  });

  it("throws ConcurrentModificationError for confirming status", async () => {
    mockFindUniquePayment.mockResolvedValue(
      makePaymentAttempt({ status: "confirming" })
    );

    await expect(confirmCheckoutPayment("order-uuid", 1, "tok_abc")).rejects.toThrow(
      ConcurrentModificationError
    );
  });

  it("throws for missing providerCheckoutId", async () => {
    mockFindUniquePayment.mockResolvedValue(
      makePaymentAttempt({ providerCheckoutId: null })
    );

    await expect(confirmCheckoutPayment("order-uuid", 1, "tok_abc")).rejects.toThrow(
      "No checkout session"
    );
  });
});
