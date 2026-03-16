import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetOrder = vi.fn();

vi.mock("@/server/services/orderService", () => ({
  getOrderForStatusPage: (...args: unknown[]) => mockGetOrder(...args),
}));

import { GET } from "../orders/[publicOrderId]/route";

function makeRequest(publicOrderId: string) {
  return new NextRequest(`http://localhost/api/orders/${publicOrderId}`);
}

describe("GET /api/orders/:publicOrderId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns order data", async () => {
    const orderData = {
      publicOrderId: "VIR-ABC123",
      status: "paid",
      currency: "USD",
      subtotalAmount: 3250,
      items: [],
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    mockGetOrder.mockResolvedValue(orderData);

    const res = await GET(makeRequest("VIR-ABC123"), {
      params: Promise.resolve({ publicOrderId: "VIR-ABC123" }),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.publicOrderId).toBe("VIR-ABC123");
    expect(data.status).toBe("paid");
  });

  it("returns 404 for not found", async () => {
    mockGetOrder.mockResolvedValue(null);

    const res = await GET(makeRequest("VIR-NOTFOUND"), {
      params: Promise.resolve({ publicOrderId: "VIR-NOTFOUND" }),
    });
    expect(res.status).toBe(404);
  });
});
