import { describe, it, expect } from "vitest";
import { getProducts, getProductById } from "../products";

describe("getProducts", () => {
  it("returns an array of products", () => {
    const products = getProducts();
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBe(10);
  });

  it("each product has required fields", () => {
    const products = getProducts();
    for (const product of products) {
      expect(product.id).toBeTypeOf("number");
      expect(product.name).toBeTypeOf("string");
      expect(product.description).toBeTypeOf("string");
      expect(product.imgUrl).toBeTypeOf("string");
      expect(product.amount).toBeTypeOf("number");
      expect(product.amount).toBeGreaterThan(0);
      expect(product.currency).toBeTypeOf("string");
      expect(Array.isArray(product.keywords)).toBe(true);
    }
  });

  it("contains products in multiple currencies", () => {
    const products = getProducts();
    const currencies = new Set(products.map((p) => p.currency));
    expect(currencies.has("USD")).toBe(true);
    expect(currencies.has("EUR")).toBe(true);
    expect(currencies.has("JPY")).toBe(true);
  });

  it("returns the same reference on subsequent calls (cached)", () => {
    const first = getProducts();
    const second = getProducts();
    expect(first).toBe(second);
  });
});

describe("getProductById", () => {
  it("returns a product by id", () => {
    const product = getProductById(1);
    expect(product).toBeDefined();
    expect(product!.id).toBe(1);
    expect(product!.name).toBe("Noir Gold Sneaker");
  });

  it("returns undefined for non-existent id", () => {
    expect(getProductById(999)).toBeUndefined();
  });

  it("returns undefined for id 0", () => {
    expect(getProductById(0)).toBeUndefined();
  });
});
