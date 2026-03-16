import { describe, it, expect } from "vitest";
import {
  SupportedCurrencySchema,
  CartItemSchema,
  CartValidateSchema,
  CheckoutCreateSchema,
  CheckoutConfirmSchema,
} from "../zod";

describe("SupportedCurrencySchema", () => {
  it("accepts USD, EUR, JPY", () => {
    expect(SupportedCurrencySchema.parse("USD")).toBe("USD");
    expect(SupportedCurrencySchema.parse("EUR")).toBe("EUR");
    expect(SupportedCurrencySchema.parse("JPY")).toBe("JPY");
  });

  it("rejects unsupported currencies", () => {
    expect(() => SupportedCurrencySchema.parse("GBP")).toThrow();
    expect(() => SupportedCurrencySchema.parse("")).toThrow();
  });

  it("rejects non-string types", () => {
    expect(() => SupportedCurrencySchema.parse(123)).toThrow();
    expect(() => SupportedCurrencySchema.parse(null)).toThrow();
  });
});

describe("CartItemSchema", () => {
  it("accepts valid item", () => {
    const result = CartItemSchema.parse({ productId: 1, quantity: 1 });
    expect(result).toEqual({ productId: 1, quantity: 1 });
  });

  it("rejects productId <= 0", () => {
    expect(() => CartItemSchema.parse({ productId: 0, quantity: 1 })).toThrow();
    expect(() => CartItemSchema.parse({ productId: -1, quantity: 1 })).toThrow();
  });

  it("rejects non-integer productId", () => {
    expect(() => CartItemSchema.parse({ productId: 1.5, quantity: 1 })).toThrow();
  });

  it("rejects quantity < 1", () => {
    expect(() => CartItemSchema.parse({ productId: 1, quantity: 0 })).toThrow();
  });

  it("rejects quantity > 99", () => {
    expect(() => CartItemSchema.parse({ productId: 1, quantity: 100 })).toThrow();
  });

  it("accepts max quantity 99", () => {
    expect(CartItemSchema.parse({ productId: 1, quantity: 99 }).quantity).toBe(99);
  });
});

describe("CartValidateSchema", () => {
  it("accepts valid input", () => {
    const result = CartValidateSchema.parse({
      items: [{ productId: 1, quantity: 2 }],
    });
    expect(result.items).toHaveLength(1);
  });

  it("rejects empty items", () => {
    expect(() => CartValidateSchema.parse({ items: [] })).toThrow();
  });

  it("allows optional displayCurrency", () => {
    const result = CartValidateSchema.parse({
      items: [{ productId: 1, quantity: 1 }],
    });
    expect(result.displayCurrency).toBeUndefined();
  });

  it("validates displayCurrency if provided", () => {
    const result = CartValidateSchema.parse({
      items: [{ productId: 1, quantity: 1 }],
      displayCurrency: "EUR",
    });
    expect(result.displayCurrency).toBe("EUR");
  });

  it("rejects invalid displayCurrency", () => {
    expect(() =>
      CartValidateSchema.parse({
        items: [{ productId: 1, quantity: 1 }],
        displayCurrency: "GBP",
      })
    ).toThrow();
  });
});

describe("CheckoutCreateSchema", () => {
  it("requires displayCurrency", () => {
    expect(() =>
      CheckoutCreateSchema.parse({
        items: [{ productId: 1, quantity: 1 }],
      })
    ).toThrow();
  });

  it("accepts valid input", () => {
    const result = CheckoutCreateSchema.parse({
      items: [{ productId: 1, quantity: 1 }],
      displayCurrency: "USD",
    });
    expect(result.displayCurrency).toBe("USD");
  });

  it("rejects empty items", () => {
    expect(() =>
      CheckoutCreateSchema.parse({
        items: [],
        displayCurrency: "USD",
      })
    ).toThrow();
  });
});

describe("CheckoutConfirmSchema", () => {
  it("accepts valid input", () => {
    const result = CheckoutConfirmSchema.parse({
      orderId: "550e8400-e29b-41d4-a716-446655440000",
      paymentAttemptId: 1,
      paymentToken: "tok_abc123",
    });
    expect(result.orderId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects non-UUID orderId", () => {
    expect(() =>
      CheckoutConfirmSchema.parse({
        orderId: "not-a-uuid",
        paymentAttemptId: 1,
        paymentToken: "tok_abc",
      })
    ).toThrow();
  });

  it("rejects non-positive paymentAttemptId", () => {
    expect(() =>
      CheckoutConfirmSchema.parse({
        orderId: "550e8400-e29b-41d4-a716-446655440000",
        paymentAttemptId: 0,
        paymentToken: "tok_abc",
      })
    ).toThrow();
  });

  it("rejects empty paymentToken", () => {
    expect(() =>
      CheckoutConfirmSchema.parse({
        orderId: "550e8400-e29b-41d4-a716-446655440000",
        paymentAttemptId: 1,
        paymentToken: "",
      })
    ).toThrow();
  });
});
