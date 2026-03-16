import { describe, it, expect } from "vitest";
import {
  canTransitionOrder,
  canTransitionPayment,
  isTerminalOrderStatus,
  isTerminalPaymentStatus,
  type OrderStatus,
  type PaymentAttemptStatus,
} from "../stateMachine";

const ALL_ORDER_STATUSES: OrderStatus[] = [
  "checkout_draft",
  "pending_payment",
  "payment_processing",
  "paid",
  "payment_failed",
  "fraud_rejected",
  "cancelled",
];

const ALL_PAYMENT_STATUSES: PaymentAttemptStatus[] = [
  "created",
  "confirming",
  "processing",
  "succeeded",
  "failed",
  "fraud_rejected",
  "timed_out",
];

describe("canTransitionOrder", () => {
  it("allows checkout_draft -> pending_payment", () => {
    expect(canTransitionOrder("checkout_draft", "pending_payment")).toBe(true);
  });

  it("allows checkout_draft -> cancelled", () => {
    expect(canTransitionOrder("checkout_draft", "cancelled")).toBe(true);
  });

  it("allows pending_payment -> paid", () => {
    expect(canTransitionOrder("pending_payment", "paid")).toBe(true);
  });

  it("allows pending_payment -> payment_processing", () => {
    expect(canTransitionOrder("pending_payment", "payment_processing")).toBe(true);
  });

  it("allows payment_processing -> paid", () => {
    expect(canTransitionOrder("payment_processing", "paid")).toBe(true);
  });

  it("allows payment_processing -> payment_failed", () => {
    expect(canTransitionOrder("payment_processing", "payment_failed")).toBe(true);
  });

  it("allows payment_failed -> pending_payment (retry)", () => {
    expect(canTransitionOrder("payment_failed", "pending_payment")).toBe(true);
  });

  it("rejects paid -> anything", () => {
    for (const status of ALL_ORDER_STATUSES) {
      expect(canTransitionOrder("paid", status)).toBe(false);
    }
  });

  it("rejects fraud_rejected -> anything", () => {
    for (const status of ALL_ORDER_STATUSES) {
      expect(canTransitionOrder("fraud_rejected", status)).toBe(false);
    }
  });

  it("rejects cancelled -> anything", () => {
    for (const status of ALL_ORDER_STATUSES) {
      expect(canTransitionOrder("cancelled", status)).toBe(false);
    }
  });

  it("rejects backward transition paid -> checkout_draft", () => {
    expect(canTransitionOrder("paid", "checkout_draft")).toBe(false);
  });
});

describe("canTransitionPayment", () => {
  it("allows created -> confirming", () => {
    expect(canTransitionPayment("created", "confirming")).toBe(true);
  });

  it("allows created -> failed", () => {
    expect(canTransitionPayment("created", "failed")).toBe(true);
  });

  it("allows confirming -> succeeded", () => {
    expect(canTransitionPayment("confirming", "succeeded")).toBe(true);
  });

  it("allows confirming -> processing", () => {
    expect(canTransitionPayment("confirming", "processing")).toBe(true);
  });

  it("allows confirming -> fraud_rejected", () => {
    expect(canTransitionPayment("confirming", "fraud_rejected")).toBe(true);
  });

  it("allows processing -> succeeded", () => {
    expect(canTransitionPayment("processing", "succeeded")).toBe(true);
  });

  it("allows processing -> failed", () => {
    expect(canTransitionPayment("processing", "failed")).toBe(true);
  });

  it("rejects succeeded -> anything", () => {
    for (const status of ALL_PAYMENT_STATUSES) {
      expect(canTransitionPayment("succeeded", status)).toBe(false);
    }
  });

  it("rejects failed -> anything", () => {
    for (const status of ALL_PAYMENT_STATUSES) {
      expect(canTransitionPayment("failed", status)).toBe(false);
    }
  });

  it("rejects timed_out -> anything", () => {
    for (const status of ALL_PAYMENT_STATUSES) {
      expect(canTransitionPayment("timed_out", status)).toBe(false);
    }
  });
});

describe("isTerminalOrderStatus", () => {
  it("returns true for paid", () => {
    expect(isTerminalOrderStatus("paid")).toBe(true);
  });

  it("returns true for fraud_rejected", () => {
    expect(isTerminalOrderStatus("fraud_rejected")).toBe(true);
  });

  it("returns true for cancelled", () => {
    expect(isTerminalOrderStatus("cancelled")).toBe(true);
  });

  it("returns false for checkout_draft", () => {
    expect(isTerminalOrderStatus("checkout_draft")).toBe(false);
  });

  it("returns false for pending_payment", () => {
    expect(isTerminalOrderStatus("pending_payment")).toBe(false);
  });

  it("returns false for payment_processing", () => {
    expect(isTerminalOrderStatus("payment_processing")).toBe(false);
  });

  it("returns false for payment_failed", () => {
    expect(isTerminalOrderStatus("payment_failed")).toBe(false);
  });
});

describe("isTerminalPaymentStatus", () => {
  it("returns true for succeeded", () => {
    expect(isTerminalPaymentStatus("succeeded")).toBe(true);
  });

  it("returns true for failed", () => {
    expect(isTerminalPaymentStatus("failed")).toBe(true);
  });

  it("returns true for fraud_rejected", () => {
    expect(isTerminalPaymentStatus("fraud_rejected")).toBe(true);
  });

  it("returns true for timed_out", () => {
    expect(isTerminalPaymentStatus("timed_out")).toBe(true);
  });

  it("returns false for created", () => {
    expect(isTerminalPaymentStatus("created")).toBe(false);
  });

  it("returns false for confirming", () => {
    expect(isTerminalPaymentStatus("confirming")).toBe(false);
  });

  it("returns false for processing", () => {
    expect(isTerminalPaymentStatus("processing")).toBe(false);
  });
});
