import { describe, it, expect } from "vitest";
import { GET } from "../products/route";

describe("GET /api/products", () => {
  it("returns all products as JSON", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(10);
  });

  it("each product has required fields", async () => {
    const response = await GET();
    const data = await response.json();

    for (const product of data) {
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("amount");
      expect(product).toHaveProperty("currency");
    }
  });
});
