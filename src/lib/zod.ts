import { z } from "zod";

export const SupportedCurrencySchema = z.enum(["USD", "EUR", "JPY"]);
export type SupportedCurrency = z.infer<typeof SupportedCurrencySchema>;

export const CartItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
});

export const CartValidateSchema = z.object({
  items: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
  displayCurrency: SupportedCurrencySchema.optional(),
});

export const CheckoutCreateSchema = z.object({
  items: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
  displayCurrency: SupportedCurrencySchema,
});

export const CheckoutConfirmSchema = z.object({
  orderId: z.string().uuid(),
  paymentAttemptId: z.number().int().positive(),
  paymentToken: z.string().min(1),
});

export type CartItem = z.infer<typeof CartItemSchema>;
export type CartValidateInput = z.infer<typeof CartValidateSchema>;
export type CheckoutCreateInput = z.infer<typeof CheckoutCreateSchema>;
export type CheckoutConfirmInput = z.infer<typeof CheckoutConfirmSchema>;
