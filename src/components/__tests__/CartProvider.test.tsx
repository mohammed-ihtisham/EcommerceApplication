// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach } from "vitest";
import { render, act, renderHook } from "@testing-library/react";
import { CartProvider, useCart } from "../CartProvider";

const STORAGE_KEY = "virellio-cart";

const PRODUCT_USD = {
  id: 1,
  name: "Noir Gold Sneaker",
  imgUrl: "https://example.com/img.jpg",
  amount: 3250,
  currency: "USD",
};

const PRODUCT_EUR = {
  id: 5,
  name: "Blush Elevate",
  imgUrl: "https://example.com/img2.jpg",
  amount: 450,
  currency: "EUR",
};

describe("CartProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function renderCartHook() {
    return renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });
  }

  it("starts with empty cart", () => {
    const { result } = renderCartHook();
    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.currency).toBeNull();
  });

  it("adds an item", () => {
    const { result } = renderCartHook();

    act(() => {
      result.current.addItem(PRODUCT_USD);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(1);
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.totalItems).toBe(1);
  });

  it("increments quantity for duplicate add", () => {
    const { result } = renderCartHook();

    act(() => {
      result.current.addItem(PRODUCT_USD);
    });
    act(() => {
      result.current.addItem(PRODUCT_USD);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.totalItems).toBe(2);
  });

  it("caps quantity at 99", () => {
    const { result } = renderCartHook();

    act(() => {
      result.current.addItem(PRODUCT_USD);
    });
    act(() => {
      result.current.updateQuantity(1, 99);
    });
    act(() => {
      result.current.addItem(PRODUCT_USD);
    });

    expect(result.current.items[0].quantity).toBe(99);
  });

  it("removes an item", () => {
    const { result } = renderCartHook();

    act(() => {
      result.current.addItem(PRODUCT_USD);
    });
    act(() => {
      result.current.removeItem(1);
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
  });

  it("updates quantity", () => {
    const { result } = renderCartHook();

    act(() => {
      result.current.addItem(PRODUCT_USD);
    });
    act(() => {
      result.current.updateQuantity(1, 5);
    });

    expect(result.current.items[0].quantity).toBe(5);
  });

  it("removes item when quantity set to 0", () => {
    const { result } = renderCartHook();

    act(() => {
      result.current.addItem(PRODUCT_USD);
    });
    act(() => {
      result.current.updateQuantity(1, 0);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it("clears cart", () => {
    const { result } = renderCartHook();

    act(() => {
      result.current.addItem(PRODUCT_USD);
      result.current.addItem(PRODUCT_EUR);
    });
    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
  });

  it("computes subtotal correctly", () => {
    const { result } = renderCartHook();

    act(() => {
      result.current.addItem(PRODUCT_USD);
    });
    act(() => {
      result.current.updateQuantity(1, 2);
    });

    expect(result.current.subtotal).toBe(3250 * 2);
  });

  it("derives currency from first item", () => {
    const { result } = renderCartHook();

    act(() => {
      result.current.addItem(PRODUCT_USD);
    });

    expect(result.current.currency).toBe("USD");
  });

  it("persists to localStorage", () => {
    const { result } = renderCartHook();

    act(() => {
      result.current.addItem(PRODUCT_USD);
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].productId).toBe(1);
  });

  it("loads from localStorage on mount", () => {
    const items = [
      {
        productId: 1,
        name: "Noir Gold Sneaker",
        imgUrl: "https://example.com/img.jpg",
        amount: 3250,
        currency: "USD",
        quantity: 3,
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

    const { result } = renderCartHook();
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
  });

  it("throws when useCart is used outside provider", () => {
    expect(() => {
      renderHook(() => useCart());
    }).toThrow("useCart must be used within CartProvider");
  });
});
