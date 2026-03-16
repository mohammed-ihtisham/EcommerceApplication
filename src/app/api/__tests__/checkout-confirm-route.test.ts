import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { ConcurrentModificationError } from "@/server/orders/orderQueries";

const mockConfirm = vi.fn();

vi.mock("@/server/services/paymentService", () => ({
  confirmCheckoutPayment: (...args: unknown[]) => mockConfirm(...args),
}));

// Re-export ConcurrentModificationError so the route can import it
vi.mock("@/server/orders/orderQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/orders/orderQueries")>();
  return actual;
});

import { POST } from "../checkout/confirm/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/checkout/confirm", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const VALID_BODY = {
  orderId: "550e8400-e29b-41d4-a716-446655440000",
  paymentAttemptId: 1,
  paymentToken: "tok_abc123",
};

describe("POST /api/checkout/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paid result on success", async () => {
    mockConfirm.mockResolvedValue({
      status: "paid",
      publicOrderId: "VIR-ABC123",
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("paid");
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(
      makeRequest({ orderId: "not-uuid", paymentAttemptId: 1, paymentToken: "tok" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing paymentToken", async () => {
    const res = await POST(
      makeRequest({
        orderId: "550e8400-e29b-41d4-a716-446655440000",
        paymentAttemptId: 1,
        paymentToken: "",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 for ConcurrentModificationError", async () => {
    mockConfirm.mockRejectedValue(new ConcurrentModificationError("PaymentAttempt", 1));

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
  });

  it("returns 500 for unexpected error", async () => {
    mockConfirm.mockRejectedValue(new Error("Unexpected"));

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
