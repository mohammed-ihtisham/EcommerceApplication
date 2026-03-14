import { getProductById, type Product } from "@/lib/products";
import { computeLineTotal, computeSubtotal } from "@/lib/money";
import type { CartItem } from "@/lib/zod";

export interface ValidatedCartItem {
  product: Product;
  quantity: number;
  lineTotal: number;
}

export interface ValidatedCart {
  items: ValidatedCartItem[];
  currency: string;
  subtotal: number;
}

export type CartValidationError = {
  error: string;
  code: "INVALID_PRODUCT" | "MIXED_CURRENCY" | "INVALID_QUANTITY" | "EMPTY_CART";
};

export function validateCart(
  items: CartItem[]
): ValidatedCart | CartValidationError {
  if (items.length === 0) {
    return { error: "Cart cannot be empty", code: "EMPTY_CART" };
  }

  const resolvedItems: ValidatedCartItem[] = [];
  let cartCurrency: string | null = null;

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

    if (cartCurrency === null) {
      cartCurrency = product.currency;
    } else if (product.currency !== cartCurrency) {
      return {
        error: `Your cart contains items priced in ${cartCurrency}. Please complete that purchase or clear your cart before adding items in another currency.`,
        code: "MIXED_CURRENCY",
      };
    }

    resolvedItems.push({
      product,
      quantity: item.quantity,
      lineTotal: computeLineTotal(product.amount, item.quantity),
    });
  }

  return {
    items: resolvedItems,
    currency: cartCurrency!,
    subtotal: computeSubtotal(
      resolvedItems.map((i) => ({ unitAmount: i.product.amount, quantity: i.quantity }))
    ),
  };
}
