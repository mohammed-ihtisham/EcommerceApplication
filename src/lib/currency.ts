import type { SupportedCurrency } from "./zod";

/** Per-currency configuration for formatting and integer math. */
export const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  { locale: string; decimals: number; symbol: string; flag: string; label: string }
> = {
  USD: { locale: "en-US", decimals: 2, symbol: "$", flag: "🇺🇸", label: "US Dollar" },
  EUR: { locale: "de-DE", decimals: 2, symbol: "€", flag: "🇪🇺", label: "Euro" },
  JPY: { locale: "ja-JP", decimals: 0, symbol: "¥", flag: "🇯🇵", label: "Japanese Yen" },
};

/**
 * Map Accept-Language primary subtag → default currency.
 * Covers major locales; falls back to USD for anything unmapped.
 */
export const REGION_TO_CURRENCY: Record<string, SupportedCurrency> = {
  "en-US": "USD",
  "en-CA": "USD",
  "en-AU": "USD",
  "en-GB": "USD",
  en: "USD",
  "de-DE": "EUR",
  "fr-FR": "EUR",
  "es-ES": "EUR",
  "it-IT": "EUR",
  "nl-NL": "EUR",
  "pt-PT": "EUR",
  de: "EUR",
  fr: "EUR",
  es: "EUR",
  it: "EUR",
  nl: "EUR",
  "ja-JP": "JPY",
  ja: "JPY",
};

export const DEFAULT_CURRENCY: SupportedCurrency = "USD";

/** Exchange rates keyed by currency code, relative to USD (USD = 1). */
export type ExchangeRates = Record<string, number>;

/** Hardcoded fallback rates (updated manually as a safety net). */
export const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  EUR: 0.92,
  JPY: 149.5,
};

/**
 * Convert an amount from one currency to another.
 *
 * Amounts are treated as major units (e.g. 3250 = $3,250, 580000 = ¥580,000).
 * The math: convert source major units to USD, then to target major units,
 * rounding to the nearest integer in the target currency.
 *
 * Pure function — no side effects, no async.
 */
export function convertAmount(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  rates: ExchangeRates
): number {
  if (from === to) return amount;

  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return amount; // defensive — should never happen

  // amount (major units) → USD → target major units
  const usdMajor = amount / fromRate;
  const targetMajor = usdMajor * toRate;
  return Math.round(targetMajor);
}

/**
 * Derive the display currency from an Accept-Language header value.
 */
export function currencyFromAcceptLanguage(header: string | null): SupportedCurrency {
  if (!header) return DEFAULT_CURRENCY;

  // Accept-Language: en-US,en;q=0.9,de;q=0.8  →  try each tag in priority order
  const tags = header
    .split(",")
    .map((part) => part.split(";")[0].trim())
    .filter(Boolean);

  for (const tag of tags) {
    if (REGION_TO_CURRENCY[tag]) return REGION_TO_CURRENCY[tag];
    // Try just the primary subtag  (e.g. "de" from "de-AT")
    const primary = tag.split("-")[0];
    if (REGION_TO_CURRENCY[primary]) return REGION_TO_CURRENCY[primary];
  }

  return DEFAULT_CURRENCY;
}
