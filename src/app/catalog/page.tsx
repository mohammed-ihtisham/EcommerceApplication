import { getProducts } from "@/lib/products";
import ProductGrid from "@/components/ProductGrid";
import FilterSidebar from "@/components/FilterSidebar";

export default function CatalogPage() {
  const products = getProducts();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAFA] font-sans text-gray-900">
      <div className="border-b border-gray-200 bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1440px] px-6 py-8 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="-ml-4 sm:-ml-5">
              <h1 className="font-serif text-4xl tracking-wide text-gray-900 sm:text-5xl">
                SHOP ALL
              </h1>
              <p className="mt-3 text-[14px] tracking-wide text-gray-600">
                A curated collection of modern luxury footwear crafted for quiet power.
              </p>
            </div>
            <div className="pb-1 text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
              18 Products
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col lg:flex-row">
          <aside className="w-full border-b border-gray-200 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
            <FilterSidebar />
          </aside>

          <main className="relative flex-1 bg-white py-8 px-6 sm:px-8 lg:px-12">
            <div className="absolute inset-y-0 left-full w-screen bg-white" aria-hidden="true" />
            
            <ProductGrid products={products} />
          </main>

        </div>
      </div>
    </div>
  );
}