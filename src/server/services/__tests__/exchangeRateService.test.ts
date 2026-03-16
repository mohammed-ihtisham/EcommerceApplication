import { describe, it, expect, vi, beforeEach } from "vitest";
import { FALLBACK_RATES } from "@/lib/currency";

describe("getExchangeRates", () => {
  const mockFetch = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  async function getModule() {
    return import("../exchangeRateService");
  }

  it("fetches and returns live rates", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          result: "success",
          rates: { EUR: 0.91, JPY: 150.2 },
        }),
    });

    const { getExchangeRates } = await getModule();
    const result = await getExchangeRates();

    expect(result.live).toBe(true);
    expect(result.rates.USD).toBe(1);
    expect(result.rates.EUR).toBe(0.91);
    expect(result.rates.JPY).toBe(150.2);
  });

  it("returns cached rates on second call (within TTL)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          result: "success",
          rates: { EUR: 0.91, JPY: 150.2 },
        }),
    });

    const { getExchangeRates } = await getModule();
    await getExchangeRates();
    await getExchangeRates();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns fallback rates on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { getExchangeRates } = await getModule();
    const result = await getExchangeRates();

    expect(result.live).toBe(false);
    expect(result.rates.USD).toBe(FALLBACK_RATES.USD);
    expect(result.rates.EUR).toBe(FALLBACK_RATES.EUR);
    expect(result.rates.JPY).toBe(FALLBACK_RATES.JPY);
  });

  it("returns fallback on non-200 response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { getExchangeRates } = await getModule();
    const result = await getExchangeRates();

    expect(result.live).toBe(false);
  });

  it("returns fallback on bad response shape", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "error" }),
    });

    const { getExchangeRates } = await getModule();
    const result = await getExchangeRates();

    expect(result.live).toBe(false);
  });
});
