"use client";

import { useState } from "react";
import { useCurrency } from "./CurrencyProvider";
import { CURRENCY_CONFIG, convertAmount } from "@/lib/currency";
import type { SupportedCurrency } from "@/lib/zod";

const staticFilterOptions = {
  TYPE: ["Sneakers", "Sandals", "Loafers", "Oxfords", "Heels"],
  MATERIAL: ["Leather", "Suede", "Metallic", "Croc-Embossed"],
  STYLE: ["Minimal", "Statement", "Formal", "Streetwear"],
};

/** Stable IDs for price tiers — these never change with currency. */
export const PRICE_TIER_IDS = ["price:under-1000", "price:1000-3000", "price:over-3000"] as const;

/** USD thresholds in minor units (cents). */
const PRICE_THRESHOLDS_USD = [1000_00, 3000_00] as const;

function formatThreshold(amount: number, currency: SupportedCurrency): string {
  const config = CURRENCY_CONFIG[currency];
  const major = config.decimals === 0 ? amount : amount / 100;
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(major);
}

function priceTierLabel(
  id: string,
  displayCurrency: SupportedCurrency,
  rates: Record<string, number>,
): string {
  const low = convertAmount(PRICE_THRESHOLDS_USD[0], "USD", displayCurrency, rates);
  const high = convertAmount(PRICE_THRESHOLDS_USD[1], "USD", displayCurrency, rates);

  if (id === "price:under-1000")  return `Under ${formatThreshold(low, displayCurrency)}`;
  if (id === "price:1000-3000")   return `${formatThreshold(low, displayCurrency)} – ${formatThreshold(high, displayCurrency)}`;
  if (id === "price:over-3000")   return `Over ${formatThreshold(high, displayCurrency)}`;
  return id;
}

const keywords = ["Gold Accents", "Chunky Sole", "Slip-On", "Evening Wear", "Futuristic", "Cap Toe"];

type FilterSidebarProps = {
  selectedFilters: string[];
  onToggleFilterAction: (option: string) => void;
  onClearAllAction: () => void;
  searchQuery: string;
  onSearchChangeAction: (value: string) => void;
};

export default function FilterSidebar({
  selectedFilters,
  onToggleFilterAction,
  onClearAllAction,
  searchQuery,
  onSearchChangeAction,
}: FilterSidebarProps) {
  const { displayCurrency, rates } = useCurrency();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    TYPE: true,
  });

  // Build the full filter options with dynamic price labels
  const filterOptions = {
    ...staticFilterOptions,
    PRICE: PRICE_TIER_IDS.map((id) => ({
      id,
      label: priceTierLabel(id, displayCurrency, rates),
    })),
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="flex flex-col py-8 pl-3 pr-6 sm:pl-4 lg:pl-6 lg:pr-8">
      
      {/* Search Bar */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input 
          type="text" 
          placeholder="Search" 
          value={searchQuery}
          onChange={(e) => onSearchChangeAction(e.target.value)}
          className="w-full border border-gray-200 bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400" 
        />
      </div>

      {/* Accordion Filters */}
      <div className="mb-8 flex flex-col border-b border-gray-200 pb-4">
        {Object.entries(filterOptions).map(([section, options]) => {
          const isOpen = openSections[section];
          // Price section uses { id, label } objects; other sections use plain strings
          const items = section === "PRICE"
            ? (options as { id: string; label: string }[]).map((o) => ({ key: o.id, label: o.label }))
            : (options as string[]).map((o) => ({ key: o, label: o }));

          return (
            <div key={section} className="border-b border-gray-100 last:border-none">
              <button
                onClick={() => toggleSection(section)}
                className="group flex w-full items-center justify-between py-5 text-left focus:outline-none"
              >
                <span className="text-xs font-medium tracking-[0.15em] text-gray-800 uppercase">
                  {section}
                </span>
                <svg className="h-4 w-4 text-gray-400 transition-colors group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M6 12h12" />
                  )}
                </svg>
              </button>

              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden flex flex-col space-y-3">
                  {items.map(({ key, label }) => {
                    const isChecked = selectedFilters.includes(key);
                    return (
                      <label
                        key={key}
                        className="group flex cursor-pointer items-center gap-3"
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={() => onToggleFilterAction(key)}
                        />

                        <div
                          className={`flex h-4 w-4 items-center justify-center border transition-colors ${
                            isChecked
                              ? "border-black bg-black"
                              : "border-gray-300 bg-white group-hover:border-gray-400"
                          }`}
                        >
                          {isChecked && (
                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        <span className={`text-[13px] transition-colors ${isChecked ? "text-gray-900 font-medium" : "text-gray-600 group-hover:text-gray-900"}`}>
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Keyword Filters */}
      <div className="mb-10 flex flex-col space-y-5">
        <span className="text-xs font-medium tracking-[0.15em] text-gray-800 uppercase">
          KEYWORD FILTERS
        </span>
        
        <div className="flex flex-wrap gap-2.5">
          {keywords.map((kw) => {
             const isChecked = selectedFilters.includes(kw);
             return (
              <button 
                key={kw} 
                onClick={() => onToggleFilterAction(kw)}
                className={`border px-3.5 py-1.5 text-xs transition-colors focus:outline-none ${
                  isChecked 
                    ? "border-black bg-black text-white" 
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-900 hover:text-gray-900"
                }`}
              >
                {kw}
              </button>
            )
          })}
        </div>
      </div>

      {/* Clear All */}
      <button 
      onClick={onClearAllAction}
        className="w-full border border-gray-200 bg-[#FAFAFA] py-3 text-xs font-medium tracking-[0.15em] text-gray-500 uppercase transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        CLEAR ALL {selectedFilters.length > 0 && `(${selectedFilters.length})`}
      </button>
    </div>
  );
}