import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock exchange rate service
vi.mock("@/server/services/exchangeRateService", () => ({
  getExchangeRates: vi.fn().mockResolvedValue({
    rates: { USD: 1, EUR: 0.92, JPY: 149.5 },
    cachedAt: new Date().toISOString(),
    live: true,
  }),
}));

import { POST } from "../cart/validate/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/cart/validate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/cart/validate", () => {
  it("returns valid cart with correct totals", async () => {
    const res = await POST(makeRequest({
      items: [{ productId: 1, quantity: 1 }],
    }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.currency).toBe("USD");
    expect(data.subtotal).toBeGreaterThan(0);
  });

  it("returns 400 for empty items", async () => {
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid schema", async () => {
    const res = await POST(makeRequest({ items: "not an array" }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 for invalid product ID", async () => {
    const res = await POST(makeRequest({
      items: [{ productId: 9999, quantity: 1 }],
    }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("INVALID_PRODUCT");
  });

  it("accepts optional displayCurrency", async () => {
    const res = await POST(makeRequest({
      items: [{ productId: 1, quantity: 1 }],
      displayCurrency: "EUR",
    }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.currency).toBe("EUR");
  });

  it("defaults to USD when displayCurrency not provided", async () => {
    const res = await POST(makeRequest({
      items: [{ productId: 1, quantity: 1 }],
    }));
    const data = await res.json();
    expect(data.currency).toBe("USD");
  });
});
