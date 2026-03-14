export function getPaymentApiKey(): string {
  const key = process.env.PAYMENT_API_KEY;
  if (!key) throw new Error("PAYMENT_API_KEY is not set");
  return key;
}
