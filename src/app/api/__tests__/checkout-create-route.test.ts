import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/server/services/exchangeRateService", () => ({
  getExchangeRates: vi.fn().mockResolvedValue({
    rates: { USD: 1, EUR: 0.92, JPY: 149.5 },
    cachedAt: new Date().toISOString(),
    live: true,
  }),
}));

const mockCreateOrder = vi.fn();
vi.mock("@/server/services/orderService", () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
}));

const mockInitiatePayment = vi.fn();
vi.mock("@/server/services/paymentService", () => ({
  initiateCheckoutPayment: (...args: unknown[]) => mockInitiatePayment(...args),
}));

import { POST } from "../checkout/create/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/checkout/create", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockOrder = {
  id: "order-uuid",
  publicOrderId: "VIR-ABC123",
  status: "checkout_draft",
  currency: "USD",
  subtotalAmount: 3250,
  items: [],
  paymentAttempts: [{ id: 1 }],
};

describe("POST /api/checkout/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateOrder.mockResolvedValue(mockOrder);
  });

  it("returns ready status on successful checkout", async () => {
    mockInitiatePayment.mockResolvedValue({
      success: true,
      checkoutId: "chk_123",
      paymentAttemptId: 1,
    });

    const res = await POST(
      makeRequest({
        items: [{ productId: 1, quantity: 1 }],
        displayCurrency: "USD",
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("ready");
    expect(data.orderId).toBe("order-uuid");
    expect(data.checkoutId).toBe("chk_123");
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing displayCurrency", async () => {
    const res = await POST(
      makeRequest({ items: [{ productId: 1, quantity: 1 }] })
    );
    expect(res.status).toBe(400);
  });

  it("returns pending status for deferred payment", async () => {
    mockInitiatePayment.mockResolvedValue({
      success: false,
      pending: true,
      orderId: "order-uuid",
      paymentAttemptId: 1,
    });

    const res = await POST(
      makeRequest({
        items: [{ productId: 1, quantity: 1 }],
        displayCurrency: "USD",
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("pending");
  });

  it("returns 502 for terminal payment failure", async () => {
    mockInitiatePayment.mockResolvedValue({
      success: false,
      retryable: false,
      message: "Not supported",
      code: "501-not-supported",
    });

    const res = await POST(
      makeRequest({
        items: [{ productId: 1, quantity: 1 }],
        displayCurrency: "USD",
      })
    );
    expect(res.status).toBe(502);
  });

  it("returns 500 on unexpected error", async () => {
    mockCreateOrder.mockRejectedValue(new Error("DB error"));

    const res = await POST(
      makeRequest({
        items: [{ productId: 1, quantity: 1 }],
        displayCurrency: "USD",
      })
    );
    expect(res.status).toBe(500);
  });
});
