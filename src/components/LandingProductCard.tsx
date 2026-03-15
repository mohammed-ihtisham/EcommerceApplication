"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart } from "./CartProvider";
import { formatMoney } from "@/lib/money";

interface LandingProductCardProps {
  id: number;
  name: string;
  imgUrl: string;
  amount: number;
  currency: string;
}

export default function LandingProductCard({
  id,
  name,
  imgUrl,
  amount,
  currency,
}: LandingProductCardProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    const error = addItem({ id, name, imgUrl, amount, currency });
    if (!error) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  }

  return (
    <article className="group flex cursor-pointer flex-col transition-transform duration-300 hover:-translate-y-1">
      {/* Grey Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#F3F3F3] flex flex-col transition-shadow duration-300 group-hover:shadow-md">
        <div className="relative flex-1 w-full p-6 overflow-hidden">
          <Image
            src={imgUrl}
            alt={name}
            fill
            className="object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        </div>

        {/* Add to Cart Button - Positioned at bottom of grey box */}
        <div className="pb-5 text-center">
          <button
            type="button"
            onClick={handleAdd}
            className="text-[11px] font-medium uppercase tracking-widest text-gray-500 transition-colors duration-200 hover:text-black group-hover:text-black"
          >
            {added ? "Added to Cart" : "Add to Cart"}
            <span className="ml-1" aria-hidden>
              →
            </span>
          </button>
        </div>
      </div>

      {/* Product Details - Below the box */}
      <div className="flex flex-col items-center pt-5 text-center">
        <h3 className="text-sm font-normal text-gray-800 tracking-tight transition-colors duration-200 group-hover:text-gray-900">
          {name}
        </h3>
        <p className="mt-1.5 text-sm font-medium text-gray-900 transition-opacity duration-200 group-hover:opacity-90">
          {formatMoney(amount, currency)}
        </p>
      </div>
    </article>
  );
}