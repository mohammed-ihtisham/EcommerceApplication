export type OrderStatus =
  | "checkout_draft"
  | "pending_payment"
  | "payment_processing"
  | "paid"
  | "payment_failed"
  | "fraud_rejected"
  | "cancelled";

export type PaymentAttemptStatus =
  | "created"
  | "confirming"
  | "processing"
  | "succeeded"
  | "failed"
  | "fraud_rejected"
  | "timed_out";

const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  checkout_draft: ["pending_payment", "payment_failed", "fraud_rejected", "cancelled"],
  pending_payment: ["payment_processing", "paid", "payment_failed", "fraud_rejected", "cancelled"],
  payment_processing: ["paid", "payment_failed", "fraud_rejected", "cancelled"],
  paid: [],
  payment_failed: ["pending_payment", "cancelled"],
  fraud_rejected: [],
  cancelled: [],
};

const VALID_PAYMENT_TRANSITIONS: Record<PaymentAttemptStatus, PaymentAttemptStatus[]> = {
  created: ["confirming", "failed", "timed_out"],
  confirming: ["processing", "succeeded", "failed", "fraud_rejected", "timed_out"],
  processing: ["succeeded", "failed", "fraud_rejected", "timed_out"],
  succeeded: [],
  failed: [],
  fraud_rejected: [],
  timed_out: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionPayment(
  from: PaymentAttemptStatus,
  to: PaymentAttemptStatus
): boolean {
  return VALID_PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === "paid" || status === "fraud_rejected" || status === "cancelled";
}

export function isTerminalPaymentStatus(status: PaymentAttemptStatus): boolean {
  return (
    status === "succeeded" ||
    status === "failed" ||
    status === "fraud_rejected" ||
    status === "timed_out"
  );
}
