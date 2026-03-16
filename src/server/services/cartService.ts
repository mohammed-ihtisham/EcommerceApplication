import { getProductById, type Product } from "@/lib/products";
import { convertAmount, type ExchangeRates } from "@/lib/currency";
import { computeLineTotal } from "@/lib/money";
import type { CartItem, SupportedCurrency } from "@/lib/zod";

export interface ValidatedCartItem {
  product: Product;
  quantity: number;
  /** Line total in the product's base currency */
  lineTotal: number;
  /** Unit amount converted to the charge currency */
  chargeUnitAmount: number;
  /** Line total converted to the charge currency */
  chargeLineTotal: number;
}

export interface ValidatedCart {
  items: ValidatedCartItem[];
  /** The currency the customer will be charged in (display currency) */
  chargeCurrency: SupportedCurrency;
  /** Subtotal in the charge currency */
  chargeSubtotal: number;
}

export type CartValidationError = {
  error: string;
  code: "INVALID_PRODUCT" | "INVALID_QUANTITY" | "EMPTY_CART";
};

/**
 * Validate cart items, convert all amounts to the charge (display) currency,
 * and compute totals. Mixed base currencies are allowed.
 */
export function validateCart(
  items: CartItem[],
  chargeCurrency: SupportedCurrency,
  rates: ExchangeRates
): ValidatedCart | CartValidationError {
  if (items.length === 0) {
    return { error: "Cart cannot be empty", code: "EMPTY_CART" };
  }

  const resolvedItems: ValidatedCartItem[] = [];

  for (const item of items) {
    const product = getProductById(item.productId);
    if (!product) {
      return {
        error: `Product ${item.productId} not found`,
        code: "INVALID_PRODUCT",
      };
    }

    if (item.quantity < 1 || item.quantity > 99) {
      return {
        error: `Invalid quantity for ${product.name}`,
        code: "INVALID_QUANTITY",
      };
    }

    const baseCurrency = product.currency as SupportedCurrency;
    const baseLineTotal = computeLineTotal(product.amount, item.quantity);
    const chargeUnitAmount = convertAmount(product.amount, baseCurrency, chargeCurrency, rates);
    const chargeLineTotal = convertAmount(baseLineTotal, baseCurrency, chargeCurrency, rates);

    resolvedItems.push({
      product,
      quantity: item.quantity,
      lineTotal: baseLineTotal,
      chargeUnitAmount,
      chargeLineTotal,
    });
  }

  const chargeSubtotal = resolvedItems.reduce((sum, i) => sum + i.chargeLineTotal, 0);

  return {
    items: resolvedItems,
    chargeCurrency,
    chargeSubtotal,
  };
}
