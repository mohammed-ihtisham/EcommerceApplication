import { CURRENCY_CONFIG } from "./currency";

export function formatMoney(amount: number, currency: string): string {
  const config = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG];
  if (!config) return `${amount} ${currency}`;

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: config.decimals,
  }).format(amount);
}

export function computeLineTotal(unitAmount: number, quantity: number): number {
  return unitAmount * quantity;
}

export function computeSubtotal(
  items: { unitAmount: number; quantity: number }[]
): number {
  return items.reduce((sum, item) => sum + computeLineTotal(item.unitAmount, item.quantity), 0);
}
