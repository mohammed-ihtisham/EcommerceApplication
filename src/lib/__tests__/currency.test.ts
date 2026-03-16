import { describe, it, expect } from "vitest";
import {
  convertAmount,
  currencyFromAcceptLanguage,
  FALLBACK_RATES,
  CURRENCY_CONFIG,
  DEFAULT_CURRENCY,
} from "../currency";

const RATES = { USD: 1, EUR: 0.92, JPY: 149.5 };

describe("convertAmount", () => {
  it("returns same amount for same currency", () => {
    expect(convertAmount(1000, "USD", "USD", RATES)).toBe(1000);
  });

  it("converts USD to EUR (cents to cents)", () => {
    // 1000 cents / 100 = $10 / 1 * 0.92 = 9.20 EUR * 100 = 920 cents
    expect(convertAmount(1000, "USD", "EUR", RATES)).toBe(920);
  });

  it("converts USD to JPY (cents to yen)", () => {
    // 1000 cents / 100 = $10 / 1 * 149.5 = 1495 JPY * 1 = 1495
    expect(convertAmount(1000, "USD", "JPY", RATES)).toBe(1495);
  });

  it("converts EUR to USD (cents to cents)", () => {
    // 920 cents / 100 = 9.20 EUR / 0.92 = $10 * 100 = 1000 cents
    expect(convertAmount(920, "EUR", "USD", RATES)).toBe(1000);
  });

  it("converts JPY to USD", () => {
    // 1495 yen / 1 = 1495 JPY / 149.5 = $10 * 100 = 1000 cents
    expect(convertAmount(1495, "JPY", "USD", RATES)).toBe(1000);
  });

  it("converts EUR to JPY (cross-rate via USD)", () => {
    // 920 cents / 100 = 9.20 EUR / 0.92 = $10 * 149.5 = 1495 JPY
    expect(convertAmount(920, "EUR", "JPY", RATES)).toBe(1495);
  });

  it("converts JPY to EUR", () => {
    // 1495 / 1 = 1495 JPY / 149.5 = $10 * 0.92 = 9.20 EUR * 100 = 920
    expect(convertAmount(1495, "JPY", "EUR", RATES)).toBe(920);
  });

  it("returns original amount when source rate is missing", () => {
    expect(convertAmount(1000, "USD", "EUR", { EUR: 0.92 })).toBe(1000);
  });

  it("returns original amount when target rate is missing", () => {
    expect(convertAmount(1000, "USD", "EUR", { USD: 1 })).toBe(1000);
  });

  it("rounds to nearest integer", () => {
    // Test with rates that produce non-integer results
    const rates = { USD: 1, EUR: 0.93 };
    const result = convertAmount(100, "USD", "EUR", rates);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe("currencyFromAcceptLanguage", () => {
  it("returns USD for null header", () => {
    expect(currencyFromAcceptLanguage(null)).toBe("USD");
  });

  it("returns EUR for de-DE", () => {
    expect(currencyFromAcceptLanguage("de-DE")).toBe("EUR");
  });

  it("returns JPY for ja-JP", () => {
    expect(currencyFromAcceptLanguage("ja-JP")).toBe("JPY");
  });

  it("returns EUR for fr-FR with quality values", () => {
    expect(currencyFromAcceptLanguage("fr-FR,en;q=0.9")).toBe("EUR");
  });

  it("falls back to primary subtag (de-AT -> de -> EUR)", () => {
    expect(currencyFromAcceptLanguage("de-AT")).toBe("EUR");
  });

  it("returns USD for unknown locale", () => {
    expect(currencyFromAcceptLanguage("zh-CN")).toBe("USD");
  });

  it("returns USD for empty string", () => {
    expect(currencyFromAcceptLanguage("")).toBe("USD");
  });

  it("picks first matching tag in multi-valued header", () => {
    expect(currencyFromAcceptLanguage("ja,de;q=0.9,en;q=0.8")).toBe("JPY");
  });
});

describe("CURRENCY_CONFIG", () => {
  it("has entries for all supported currencies", () => {
    expect(CURRENCY_CONFIG.USD).toBeDefined();
    expect(CURRENCY_CONFIG.EUR).toBeDefined();
    expect(CURRENCY_CONFIG.JPY).toBeDefined();
  });

  it("JPY has 0 decimals", () => {
    expect(CURRENCY_CONFIG.JPY.decimals).toBe(0);
  });

  it("USD and EUR have 2 decimals", () => {
    expect(CURRENCY_CONFIG.USD.decimals).toBe(2);
    expect(CURRENCY_CONFIG.EUR.decimals).toBe(2);
  });
});

describe("FALLBACK_RATES", () => {
  it("has USD = 1", () => {
    expect(FALLBACK_RATES.USD).toBe(1);
  });

  it("has EUR and JPY", () => {
    expect(FALLBACK_RATES.EUR).toBeDefined();
    expect(FALLBACK_RATES.JPY).toBeDefined();
  });
});

describe("DEFAULT_CURRENCY", () => {
  it("is USD", () => {
    expect(DEFAULT_CURRENCY).toBe("USD");
  });
});
