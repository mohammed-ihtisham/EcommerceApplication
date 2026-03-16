import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetStatus = vi.fn();

vi.mock("@/server/services/paymentService", () => ({
  getCheckoutStatus: (...args: unknown[]) => mockGetStatus(...args),
}));

import { GET } from "../checkout/status/route";

describe("GET /api/checkout/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ready status", async () => {
    mockGetStatus.mockResolvedValue({
      status: "ready",
      checkoutId: "chk_123",
      paymentAttemptId: 1,
    });

    const req = new NextRequest("http://localhost/api/checkout/status?orderId=uuid-123");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("ready");
    expect(data.checkoutId).toBe("chk_123");
  });

  it("returns 400 for missing orderId", async () => {
    const req = new NextRequest("http://localhost/api/checkout/status");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns pending status", async () => {
    mockGetStatus.mockResolvedValue({ status: "pending" });

    const req = new NextRequest("http://localhost/api/checkout/status?orderId=uuid-123");
    const res = await GET(req);
    const data = await res.json();
    expect(data.status).toBe("pending");
  });
});
