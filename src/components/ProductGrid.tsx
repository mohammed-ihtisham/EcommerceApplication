"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ProductCard from "./ProductCard";

interface Product {
  id: number;
  name: string;
  imgUrl: string;
  amount: number;
  currency: string;
}

const quickFilters = ["Gold Accents", "Chunky Sole", "Slip-On", "Evening Wear", "Futuristic", "Cap Toe"];

type SortOption = "Featured" | "Price: Low to High" | "Price: High to Low";

interface ProductGridProps {
  products: Product[];
  selectedFilters?: string[];
  onToggleFilter?: (filter: string) => void;
}

function toUsd(amount: number, currency: string): number {
  switch (currency) {
    case "EUR":
      return amount * 1.1;
    case "JPY":
      return amount / 150;
    default:
      return amount;
  }
}

export default function ProductGrid({ products, selectedFilters = [], onToggleFilter }: ProductGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("Featured");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Measure the ideal width for the pill and animate between values
  useEffect(() => {
    if (!buttonRef.current || !measureRef.current) return;

    // Read the natural width of the hidden pill (icons + text + padding)
    const contentWidth = measureRef.current.getBoundingClientRect().width;

    // Tiny buffer so we don't clip the border radius at different zoom levels
    const EXTRA = 4;
    const targetWidth = contentWidth + EXTRA;

    setButtonWidth(targetWidth);
  }, [sortBy]);

  const sortedProducts = useMemo(() => {
    const base = [...products];

    if (sortBy === "Price: Low to High" || sortBy === "Price: High to Low") {
      return base.sort((a, b) => {
        const aPrice = toUsd(a.amount, a.currency);
        const bPrice = toUsd(b.amount, b.currency);
        return sortBy === "Price: Low to High" ? aPrice - bPrice : bPrice - aPrice;
      });
    }

    return base;
  }, [products, sortBy]);

  const handleSelectSort = (option: SortOption) => {
    setSortBy(option);
    setIsOpen(false);
  };

  return (
    <div className="flex w-full flex-col bg-white">
      {/* Top Filter & Sort Bar */}
      <div className="mb-8 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        {/* Quick-filter pills */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {quickFilters.map((kw) => {
            const isActive = selectedFilters.includes(kw);
            return (
              <button
                key={kw}
                onClick={() => onToggleFilter?.(kw)}
                className={`border px-3.5 py-1.5 text-[13px] transition-colors ${
                  isActive
                    ? "border-black bg-black text-white"
                    : "border-gray-100 bg-[#FAFAFA] text-gray-600 hover:border-gray-300 hover:text-gray-900"
                }`}
              >
                {kw}
              </button>
            );
          })}
        </div>

        {/* Dynamic Sort Dropdown */}
        <div className="flex shrink-0 items-center">
          <div ref={dropdownRef} className="relative">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="inline-flex items-center gap-x-2.5 overflow-hidden rounded-full border border-gray-300 bg-white px-4 py-2 text-[14px] font-medium text-gray-800 shadow-sm transition-[width,border-color,box-shadow,background-color,transform] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-gray-400 focus:outline-none"
              style={buttonWidth ? { width: `${buttonWidth}px` } : undefined}
            >
              {/* Left Sort Icon */}
              <svg 
                className="h-4 w-4 shrink-0 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth="1.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>

              {/* Text - whitespace-nowrap prevents jumping/stacking during the animation */}
              <span className="whitespace-nowrap">{sortBy}</span>
              
              {/* Right Chevron */}
              <svg
                className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-150 delay-0 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Hidden measuring span for smooth width transitions */}
            <span
              ref={measureRef}
              className="pointer-events-none absolute left-0 top-0 -z-10 inline-flex items-center gap-x-2.5 rounded-full border px-4 py-2 text-[14px] font-medium opacity-0"
            >
              {/* Match structure: icon + text + chevron so measurement is accurate */}
              <svg className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{sortBy}</span>
              <svg className="h-4 w-4 shrink-0" />
            </span>

            {/* Dropdown Menu */}
            <div 
              // Set a fixed width here (w-52) so the menu doesn't shrink awkwardly when the button gets small
              className={`absolute right-0 z-20 mt-2 w-52 origin-top-right overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isOpen 
                  ? "visible translate-y-0 scale-100 opacity-100" 
                  : "invisible -translate-y-2 scale-95 opacity-0 pointer-events-none"
              }`}
            >
              {(["Featured", "Price: Low to High", "Price: High to Low"] as SortOption[]).map((option) => {
                const isActive = option === sortBy;
                return (
                  <button
                    key={option}
                    onClick={() => handleSelectSort(option)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-[14px] transition-colors ${
                      isActive
                        ? "bg-[#111827] text-white font-medium"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span>{option}</span>
                    {isActive && (
                      <svg
                        className="h-4 w-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid or Empty State */}
      {sortedProducts.length > 0 ? (
        <div className="grid w-full grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      ) : (
        <div className="flex w-full flex-col items-center justify-center py-32 text-center transition-opacity duration-500">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-[#FAFAFA] shadow-sm">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h3 className="font-serif text-2xl tracking-wide text-gray-900">
            No matches found
          </h3>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-gray-500">
            We couldn't find any pieces matching your current selections. Try removing some filters or adjusting your search to explore the collection.
          </p>
        </div>
      )}
    </div>
  );
}