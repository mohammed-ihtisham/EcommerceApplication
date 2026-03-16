"use client";

import { useCart, type CartItemData } from "./CartProvider";
import { useCurrency } from "./CurrencyProvider";
import type { SupportedCurrency } from "@/lib/zod";

export default function CartItemRow({ item }: { item: CartItemData }) {
  const { updateQuantity, removeItem } = useCart();
  const { formatPrice } = useCurrency();

  const handleDecrement = () => {
    if (item.quantity <= 1) return;
    updateQuantity(item.productId, item.quantity - 1);
  };

  const handleIncrement = () => {
    updateQuantity(item.productId, item.quantity + 1);
  };

  return (
    <div className="flex w-full gap-3 rounded-[1.25rem] border border-gray-100 bg-white px-3.5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-md">
      
      {/* Product Image */}
      <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-xl bg-transparent">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imgUrl}
          alt={item.name}
          className="absolute inset-0 h-full w-full  object-cover"
        />
      </div>

      {/* Content Container */}
      <div className="flex flex-1 flex-col justify-between">
        
        {/* Top Row: Info & Trash Icon */}
        <div className="flex items-start justify-between gap-2">
          {/* Text Info (Name + Unit Price) */}
          <div className="flex flex-col">
            <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
              {item.name}
            </h4>
            <p className="mt-0.5 text-xs text-gray-500">
              {formatPrice(item.amount, item.currency as SupportedCurrency)}
            </p>
          </div>

          {/* Trash Icon */}
          <button
            onClick={() => removeItem(item.productId)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none"
            aria-label={`Remove ${item.name} from cart`}
          >
            <svg 
              className="h-4 w-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
          </button>
        </div>

        {/* Bottom Row: Pill & Total Price */}
        <div className="mt-3 flex items-center justify-between">
          
          {/* Horizontal Quantity Pill */}
          <div className="flex h-8 items-center rounded-full border border-gray-200 bg-white shadow-sm">
            <button
              onClick={handleDecrement}
              className="flex h-full w-8 items-center justify-center rounded-l-full text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none"
              aria-label="Decrease quantity"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <input
              type="number"
              min={1}
              max={99}
              value={item.quantity}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isNaN(next)) return;
                const clamped = Math.min(Math.max(next, 1), 99);
                updateQuantity(item.productId, clamped);
              }}
              className="w-10 border-none bg-transparent text-center text-xs font-semibold text-gray-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={handleIncrement}
              className="flex h-full w-8 items-center justify-center rounded-r-full text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none"
              aria-label="Increase quantity"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Total Price */}
          <span className="text-sm font-bold tracking-tight text-gray-900">
            {formatPrice(item.amount * item.quantity, item.currency as SupportedCurrency)}
          </span>
          
        </div>
      </div>
    </div>
  );
}