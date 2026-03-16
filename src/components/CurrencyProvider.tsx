"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  convertAmount,
  CURRENCY_CONFIG,
  DEFAULT_CURRENCY,
  FALLBACK_RATES,
  type ExchangeRates,
} from "@/lib/currency";
import type { SupportedCurrency } from "@/lib/zod";

interface CurrencyContextValue {
  /** The user's chosen display currency */
  displayCurrency: SupportedCurrency;
  /** Current exchange rates (relative to USD) */
  rates: ExchangeRates;
  /** Whether rates have been loaded from the API */
  ratesLoaded: boolean;
  /** Switch the display currency */
  setDisplayCurrency: (currency: SupportedCurrency) => void;
  /** Convert an amount from its base currency to the display currency (integer) */
  convertForDisplay: (amount: number, baseCurrency: SupportedCurrency) => number;
  /** Convert and format for display */
  formatPrice: (amount: number, baseCurrency: SupportedCurrency) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const COOKIE_NAME = "virellio-currency";

function readCurrencyCookie(): SupportedCurrency {
  if (typeof document === "undefined") return DEFAULT_CURRENCY;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  const val = match?.split("=")[1];
  if (val === "USD" || val === "EUR" || val === "JPY") return val;
  return DEFAULT_CURRENCY;
}

function setCurrencyCookie(currency: SupportedCurrency) {
  const oneYear = 365 * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${currency}; path=/; max-age=${oneYear}; SameSite=Lax`;
}

export function CurrencyProvider({
  initialCurrency,
  children,
}: {
  initialCurrency?: SupportedCurrency;
  children: React.ReactNode;
}) {
  const [displayCurrency, setDisplayCurrencyState] = useState<SupportedCurrency>(
    initialCurrency ?? DEFAULT_CURRENCY
  );
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // On mount, read the cookie (handles hydration mismatch for the cookie case)
  useEffect(() => {
    if (!initialCurrency) {
      setDisplayCurrencyState(readCurrencyCookie());
    }
  }, [initialCurrency]);

  // Fetch live rates on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchRates() {
      try {
        const res = await fetch("/api/exchange-rates");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.rates) {
          setRates(data.rates);
          setRatesLoaded(true);
        }
      } catch {
        // Fallback rates already set
      }
    }
    fetchRates();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDisplayCurrency = useCallback((currency: SupportedCurrency) => {
    setDisplayCurrencyState(currency);
    setCurrencyCookie(currency);
  }, []);

  const convertForDisplay = useCallback(
    (amount: number, baseCurrency: SupportedCurrency): number => {
      return convertAmount(amount, baseCurrency, displayCurrency, rates);
    },
    [displayCurrency, rates]
  );

  const formatPrice = useCallback(
    (amount: number, baseCurrency: SupportedCurrency): string => {
      const converted = convertAmount(amount, baseCurrency, displayCurrency, rates);
      const config = CURRENCY_CONFIG[displayCurrency];
      return new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: displayCurrency,
        minimumFractionDigits: config.decimals,
      }).format(converted);
    },
    [displayCurrency, rates]
  );

  const value = useMemo(
    () => ({
      displayCurrency,
      rates,
      ratesLoaded,
      setDisplayCurrency,
      convertForDisplay,
      formatPrice,
    }),
    [displayCurrency, rates, ratesLoaded, setDisplayCurrency, convertForDisplay, formatPrice]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
