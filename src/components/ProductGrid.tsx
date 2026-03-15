"use client";

import ProductCard from "./ProductCard";

interface Product {
  id: number;
  name: string;
  imgUrl: string;
  amount: number;
  currency: string;
}

export default function ProductGrid({ products }: { products: Product[] }) {
  const topKeywords = ["Minimal", "Formal", "Everyday", "Statement", "Handcraft"];

  return (
    <div className="flex w-full flex-col bg-white">
      {/* Top Filter & Sort Bar */}
      <div className="mb-8 flex w-full flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Top Keywords */}
        <div className="flex flex-1 items-center gap-4">
          <span className="hidden text-[13px] text-gray-900 lg:block">Keyword Filters</span>
          <div className="flex flex-wrap gap-2">
            {topKeywords.map((kw) => (
              <button key={kw} className="border border-gray-100 bg-[#FAFAFA] px-4 py-1.5 text-[13px] text-gray-600 transition-colors hover:border-gray-300">
                {kw}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Dropdown */}
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-[13px] text-gray-500">Sort by</span>
          <div className="relative">
            <select className="appearance-none border border-gray-200 bg-white py-2 pl-4 pr-10 text-[13px] text-gray-900 outline-none hover:border-gray-300 focus:border-gray-400">
              <option>Featured</option>
              <option>Newest</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid w-full grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </div>
  );
}