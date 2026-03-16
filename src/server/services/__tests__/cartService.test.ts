import { describe, it, expect } from "vitest";
import { validateCart } from "../cartService";

const RATES = { USD: 1, EUR: 0.92, JPY: 149.5 };

describe("validateCart", () => {
  it("validates a single USD item with USD display", () => {
    const result = validateCart([{ productId: 1, quantity: 1 }], "USD", RATES);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.items).toHaveLength(1);
      expect(result.chargeCurrency).toBe("USD");
      expect(result.chargeSubtotal).toBeGreaterThan(0);
    }
  });

  it("computes correct totals for multiple items", () => {
    const result = validateCart(
      [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
      "USD",
      RATES
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.items).toHaveLength(2);
      const sum = result.items.reduce((s, i) => s + i.chargeLineTotal, 0);
      expect(result.chargeSubtotal).toBe(sum);
    }
  });

  it("returns EMPTY_CART for empty items", () => {
    const result = validateCart([], "USD", RATES);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.code).toBe("EMPTY_CART");
    }
  });

  it("returns INVALID_PRODUCT for non-existent product", () => {
    const result = validateCart([{ productId: 9999, quantity: 1 }], "USD", RATES);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.code).toBe("INVALID_PRODUCT");
    }
  });

  it("returns INVALID_QUANTITY for quantity 0", () => {
    const result = validateCart([{ productId: 1, quantity: 0 }], "USD", RATES);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.code).toBe("INVALID_QUANTITY");
    }
  });

  it("returns INVALID_QUANTITY for quantity > 99", () => {
    const result = validateCart([{ productId: 1, quantity: 100 }], "USD", RATES);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.code).toBe("INVALID_QUANTITY");
    }
  });

  it("converts USD product to EUR display currency", () => {
    const result = validateCart([{ productId: 1, quantity: 1 }], "EUR", RATES);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.chargeCurrency).toBe("EUR");
      // chargeUnitAmount should be different from the USD amount
      const product1Amount = 3250; // from products.json
      expect(result.items[0].chargeUnitAmount).not.toBe(product1Amount);
      expect(result.items[0].chargeUnitAmount).toBeGreaterThan(0);
    }
  });

  it("keeps same amount when display matches base currency", () => {
    const result = validateCart([{ productId: 1, quantity: 1 }], "USD", RATES);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      // Product 1 is in USD, display is USD, so chargeUnitAmount should equal product amount
      expect(result.items[0].chargeUnitAmount).toBe(3250);
    }
  });

  it("handles JPY products correctly", () => {
    // Product 7 is JPY (Executive Cap-Toe Oxfords, 580000 JPY)
    const result = validateCart([{ productId: 7, quantity: 1 }], "JPY", RATES);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.chargeCurrency).toBe("JPY");
      expect(result.items[0].chargeUnitAmount).toBe(580000);
    }
  });
});
