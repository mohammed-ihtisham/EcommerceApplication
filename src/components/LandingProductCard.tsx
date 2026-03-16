"use client";

import { useState } from "react";
import Link from "next/link";
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

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const error = addItem({ id, name, imgUrl, amount, currency });
    if (!error) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  }

  return (
    <Link
      href={`/product/${id}`}
      className="group flex cursor-pointer flex-col transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#F3F3F3] flex flex-col transition-shadow duration-300 group-hover:shadow-md">
        <div className="relative flex-1 w-full p-6 overflow-hidden">
          <Image
            src={imgUrl}
            alt={name}
            fill
            className="object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-90 group-hover:-translate-y-3"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center opacity-0 translate-y-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0">
          <button
            type="button"
            onClick={handleAdd}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-900 shadow-sm backdrop-blur-sm transition-all hover:bg-black hover:text-white hover:scale-105"
          >
            {added ? (
              <>
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Added
              </>
            ) : (
              "+ Quick Add"
            )}
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
    </Link>
  );
}