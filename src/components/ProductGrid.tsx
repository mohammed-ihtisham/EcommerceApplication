"use client";

import ProductCard from "./ProductCard";

interface Product {
  id: number;
  name: string;
  description: string;
  imgUrl: string;
  amount: number;
  currency: string;
}

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
}
