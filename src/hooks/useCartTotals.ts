import { useMemo } from "react";
import { useCart } from "@/components/CartProvider";
import { useCurrency } from "@/components/CurrencyProvider";
import type { SupportedCurrency } from "@/lib/zod";

/**
 * Computes cart subtotal in the user's display currency by converting
 * each item's base-currency amount via live exchange rates.
 */
export function useCartTotals() {
  const { items } = useCart();
  const { displayCurrency, convertForDisplay } = useCurrency();

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          convertForDisplay(
            item.amount * item.quantity,
            item.currency as SupportedCurrency
          ),
        0
      ),
    [items, convertForDisplay]
  );

  return { subtotal, displayCurrency };
}
