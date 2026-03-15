import { getProducts } from "@/lib/products";
import ProductGrid from "@/components/ProductGrid";

export default function CatalogPage() {
  const products = getProducts();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Our Collection
        </h1>
        <p className="mt-1 text-gray-500">
          Luxury footwear for the modern connoisseur
        </p>
      </div>
      <ProductGrid products={products} />
    </div>
  );
}
