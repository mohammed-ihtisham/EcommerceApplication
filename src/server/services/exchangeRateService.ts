import { FALLBACK_RATES, type ExchangeRates } from "@/lib/currency";
import { logger } from "@/lib/logger";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const API_URL = "https://open.er-api.com/v6/latest/USD";

let cachedRates: ExchangeRates | null = null;
let cachedAt: number = 0;

/**
 * Fetch live exchange rates from the open.er-api.com free tier.
 * Caches in-memory for 1 hour. Falls back to hardcoded rates on failure.
 */
export async function getExchangeRates(): Promise<{
  rates: ExchangeRates;
  cachedAt: string;
  live: boolean;
}> {
  const now = Date.now();

  // Return cached if still fresh
  if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
    return {
      rates: cachedRates,
      cachedAt: new Date(cachedAt).toISOString(),
      live: true,
    };
  }

  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`API returned ${res.status}`);

    const data = await res.json();
    if (data.result !== "success" || !data.rates) {
      throw new Error("Unexpected API response shape");
    }

    // Extract only the currencies we support
    const rates: ExchangeRates = {
      USD: 1,
      EUR: data.rates.EUR ?? FALLBACK_RATES.EUR,
      JPY: data.rates.JPY ?? FALLBACK_RATES.JPY,
    };

    cachedRates = rates;
    cachedAt = now;

    logger.info("Exchange rates refreshed", { rates });

    return {
      rates,
      cachedAt: new Date(now).toISOString(),
      live: true,
    };
  } catch (err) {
    logger.warn("Failed to fetch exchange rates, using fallback", {
      error: String(err),
    });

    // If we have stale cached rates, prefer those over hardcoded fallbacks
    const rates = cachedRates ?? FALLBACK_RATES;
    return {
      rates,
      cachedAt: cachedAt
        ? new Date(cachedAt).toISOString()
        : new Date(now).toISOString(),
      live: false,
    };
  }
}
