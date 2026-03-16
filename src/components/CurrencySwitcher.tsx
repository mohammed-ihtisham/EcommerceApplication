"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrency } from "./CurrencyProvider";
import { CURRENCY_CONFIG } from "@/lib/currency";
import type { SupportedCurrency } from "@/lib/zod";

const CURRENCIES: SupportedCurrency[] = ["USD", "EUR", "JPY"];

export default function CurrencySwitcher() {
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-900 transition-colors hover:text-gray-600"
      >
        <span className="text-base leading-none">{CURRENCY_CONFIG[displayCurrency].flag}</span>
        <span className="hidden sm:inline">{displayCurrency}</span>
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {CURRENCIES.map((code) => {
            const config = CURRENCY_CONFIG[code];
            const isActive = code === displayCurrency;
            return (
              <button
                key={code}
                onClick={() => {
                  setDisplayCurrency(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-gray-50 font-medium text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="w-5 text-center text-base leading-none">{config.flag}</span>
                <span>{code}</span>
                <span className="ml-auto text-xs text-gray-400">{config.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
