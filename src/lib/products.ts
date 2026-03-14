import { z } from "zod";
import productsData from "../../data/products.json";

export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  imgUrl: z.string().url(),
  amount: z.number().int().positive(),
  currency: z.string(),
});

export type Product = z.infer<typeof ProductSchema>;

const ProductsArraySchema = z.array(ProductSchema);

let _products: Product[] | null = null;

export function getProducts(): Product[] {
  if (!_products) {
    _products = ProductsArraySchema.parse(productsData);
  }
  return _products;
}

export function getProductById(id: number): Product | undefined {
  return getProducts().find((p) => p.id === id);
}
