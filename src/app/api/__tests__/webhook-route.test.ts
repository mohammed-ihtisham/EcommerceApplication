import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockFindPaymentByCheckout = vi.fn();
const mockFindPaymentByOrder = vi.fn();
const mockUpdatePaymentAndOrder = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEvent: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/server/orders/orderQueries", () => ({
  findPaymentAttemptByCheckoutId: (...args: unknown[]) => mockFindPaymentByCheckout(...args),
  findPaymentAttemptByOrderId: (...args: unknown[]) => mockFindPaymentByOrder(...args),
  updatePaymentAndOrderStatus: (...args: unknown[]) => mockUpdatePaymentAndOrder(...args),
  ConcurrentModificationError: class ConcurrentModificationError extends Error {
    constructor(entity: string, id: string | number) {
      super(`Concurrent modification detected on ${entity} ${id}`);
      this.name = "ConcurrentModificationError";
    }
  },
}));

import { POST } from "../payments/webhook/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/payments/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/payments/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(null); // not a duplicate
    mockCreate.mockResolvedValue({});
  });

  it("returns 400 for missing uid", async () => {
    const res = await POST(makeRequest({ type: "checkout.confirm.success" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing type", async () => {
    const res = await POST(makeRequest({ uid: "evt_123" }));
    expect(res.status).toBe(400);
  });

  it("handles duplicate webhook idempotently", async () => {
    mockFindUnique.mockResolvedValue({ providerEventId: "evt_123" });

    const res = await POST(
      makeRequest({
        uid: "evt_123",
        type: "checkout.confirm.success",
        data: { checkoutId: "chk_123" },
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.duplicate).toBe(true);
  });

  it("processes checkout.confirm.success", async () => {
    mockFindPaymentByCheckout.mockResolvedValue({
      id: 1,
      orderId: "order-uuid",
    });

    const res = await POST(
      makeRequest({
        uid: "evt_123",
        type: "checkout.confirm.success",
        data: { checkoutId: "chk_123", confirmationId: "conf_456" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpdatePaymentAndOrder).toHaveBeenCalledWith(
      1,
      "succeeded",
      "order-uuid",
      "paid",
      { providerPaymentId: "conf_456" }
    );
  });

  it("processes checkout.confirm.failure", async () => {
    mockFindPaymentByCheckout.mockResolvedValue({
      id: 1,
      orderId: "order-uuid",
    });

    const res = await POST(
      makeRequest({
        uid: "evt_124",
        type: "checkout.confirm.failure",
        data: { checkoutId: "chk_123", message: "Declined" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpdatePaymentAndOrder).toHaveBeenCalledWith(
      1,
      "failed",
      "order-uuid",
      "payment_failed",
      expect.objectContaining({ failureMessage: "Declined" })
    );
  });

  it("processes checkout.confirm.failure with fraud", async () => {
    mockFindPaymentByCheckout.mockResolvedValue({
      id: 1,
      orderId: "order-uuid",
    });

    const res = await POST(
      makeRequest({
        uid: "evt_125",
        type: "checkout.confirm.failure",
        data: { checkoutId: "chk_123", reason: "fraud", message: "Fraud detected" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpdatePaymentAndOrder).toHaveBeenCalledWith(
      1,
      "fraud_rejected",
      "order-uuid",
      "fraud_rejected",
      expect.objectContaining({ failureMessage: "Fraud detected" })
    );
  });

  it("handles missing checkoutId gracefully", async () => {
    const res = await POST(
      makeRequest({
        uid: "evt_126",
        type: "checkout.confirm.success",
        data: {},
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });

  it("handles unknown payment attempt gracefully", async () => {
    mockFindPaymentByCheckout.mockResolvedValue(null);

    const res = await POST(
      makeRequest({
        uid: "evt_127",
        type: "checkout.confirm.success",
        data: { checkoutId: "chk_unknown" },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });

  it("handles unhandled event type", async () => {
    mockFindPaymentByCheckout.mockResolvedValue({
      id: 1,
      orderId: "order-uuid",
    });

    const res = await POST(
      makeRequest({
        uid: "evt_128",
        type: "some.unknown.event",
        data: { checkoutId: "chk_123" },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });
});
