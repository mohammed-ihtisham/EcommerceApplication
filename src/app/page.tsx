import { getProducts } from "@/lib/products";
import ProductGrid from "@/components/ProductGrid";
import CartDrawer from "@/components/CartDrawer";

export default function HomePage() {
  const products = getProducts();

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Our Collection</h1>
          <p className="mt-1 text-gray-500">Luxury footwear for the modern connoisseur</p>
        </div>
        <CartDrawer />
      </div>
      <ProductGrid products={products} />
    </>
  );
}
