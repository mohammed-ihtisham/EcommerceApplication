 "use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { useCart } from "./CartProvider";

interface Product {
  id: number;
  name: string;
  imgUrl: string;
  amount: number;
  currency: string;
}

export default function ProductCard({ id, name, imgUrl, amount, currency }: Product) {
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
    <Link href={`/product/${id}`} className="group flex cursor-pointer flex-col">
      <div className="relative mb-4 aspect-square w-full overflow-hidden bg-[#F4F4F4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-contain p-6 mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-95 group-hover:-translate-y-3"
        />
        <div className="absolute bottom-3 left-1/2 flex w-full -translate-x-1/2 translate-y-4 items-center justify-center opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 text-[10px] font-semibold tracking-[0.16em] text-gray-900 shadow-sm backdrop-blur-sm transition-all hover:bg-black hover:text-white hover:scale-105 focus:outline-none"
          >
            {added ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                ADDED
              </>
            ) : (
              "+ QUICK ADD"
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        <h3 className="text-[15px] font-medium tracking-wide text-gray-900">
          {name}
        </h3>
        <p className="mt-1 text-[15px] text-gray-500">
          {formatMoney(amount, currency)}
        </p>
      </div>
    </Link>
  );
}