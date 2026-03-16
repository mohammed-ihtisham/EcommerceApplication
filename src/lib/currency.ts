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
 * Minor-unit factor for a currency.
 * USD/EUR: 100 (amounts stored as cents)
 * JPY: 1 (amounts stored as whole yen)
 */
function minorUnitFactor(currency: SupportedCurrency): number {
  return CURRENCY_CONFIG[currency].decimals === 0 ? 1 : 100;
}

/**
 * Convert an integer amount from one currency to another.
 *
 * The math: normalise to major units in the source currency,
 * convert via USD cross-rate, then scale to minor units of the
 * target currency and round to the nearest integer.
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

  const fromFactor = minorUnitFactor(from);
  const toFactor = minorUnitFactor(to);

  // amount (minor units) → major units → USD → target major units → target minor units
  const majorUnits = amount / fromFactor;
  const usdMajor = majorUnits / fromRate;
  const targetMajor = usdMajor * toRate;
  return Math.round(targetMajor * toFactor);
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
