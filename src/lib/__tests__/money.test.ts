import { describe, it, expect } from "vitest";
import { formatMoney, computeLineTotal, computeSubtotal } from "../money";

describe("formatMoney", () => {
  it("formats USD with two decimals", () => {
    const result = formatMoney(3250, "USD");
    expect(result).toContain("3,250");
    expect(result).toContain("$");
  });

  it("formats EUR with euro symbol", () => {
    const result = formatMoney(450, "EUR");
    expect(result).toContain("450");
    expect(result).toContain("€");
  });

  it("formats JPY with no decimals", () => {
    const result = formatMoney(580000, "JPY");
    expect(result).toContain("580,000");
    // Intl may produce fullwidth yen ￥ or halfwidth ¥ depending on locale
    expect(result).toMatch(/[¥￥]/);
    expect(result).not.toContain(".");
  });

  it("falls back for unknown currency", () => {
    expect(formatMoney(100, "GBP")).toBe("100 GBP");
  });

  it("formats zero amount", () => {
    const result = formatMoney(0, "USD");
    expect(result).toContain("$");
    expect(result).toContain("0");
  });
});

describe("computeLineTotal", () => {
  it("multiplies unit amount by quantity", () => {
    expect(computeLineTotal(3250, 2)).toBe(6500);
  });

  it("returns unit amount for quantity 1", () => {
    expect(computeLineTotal(850, 1)).toBe(850);
  });

  it("returns 0 for quantity 0", () => {
    expect(computeLineTotal(1000, 0)).toBe(0);
  });
});

describe("computeSubtotal", () => {
  it("sums line totals for multiple items", () => {
    const items = [
      { unitAmount: 1000, quantity: 2 },
      { unitAmount: 500, quantity: 3 },
    ];
    expect(computeSubtotal(items)).toBe(3500);
  });

  it("returns 0 for empty array", () => {
    expect(computeSubtotal([])).toBe(0);
  });

  it("handles single item", () => {
    expect(computeSubtotal([{ unitAmount: 100, quantity: 5 }])).toBe(500);
  });
});
