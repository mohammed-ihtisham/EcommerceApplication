"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import { formatMoney } from "@/lib/money";

interface ProductCardProps {
  id: number;
  name: string;
  description: string;
  imgUrl: string;
  amount: number;
  currency: string;
}

export default function ProductCard({
  id,
  name,
  description,
  imgUrl,
  amount,
  currency,
}: ProductCardProps) {
  const { addItem } = useCart();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    const error = addItem({ id, name, imgUrl, amount, currency });
    if (error) {
      setFeedback(error);
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <p className="mt-1 flex-1 text-sm text-gray-500 line-clamp-2">{description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">
            {formatMoney(amount, currency)}
          </span>
          <button
            onClick={handleAdd}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              added
                ? "bg-green-600 text-white"
                : "bg-gray-900 text-white hover:bg-gray-700"
            }`}
          >
            {added ? "Added!" : "Add to Cart"}
          </button>
        </div>
        {feedback && (
          <p className="mt-2 text-xs text-red-600">{feedback}</p>
        )}
      </div>
    </div>
  );
}
