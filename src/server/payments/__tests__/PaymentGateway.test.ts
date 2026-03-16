import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the bun polyfill
vi.mock("@/lib/bun-polyfill", () => ({}));

// Mock the payment SDK with a class-based implementation
const mockCreate = vi.fn();
const mockConfirm = vi.fn();
const mockCreateEndpoint = vi.fn();

vi.mock("@henrylabs-interview/payments", () => {
  return {
    PaymentProcessor: class MockPaymentProcessor {
      checkout = {
        create: mockCreate,
        confirm: mockConfirm,
      };
      webhooks = {
        createEndpoint: mockCreateEndpoint,
      };
      constructor() {
        // noop
      }
    },
  };
});

// Import after mocks are set up
import { createCheckout, confirmCheckout, registerWebhook } from "../PaymentGateway";

describe("createCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success for 201-immediate", async () => {
    mockCreate.mockResolvedValue({
      status: "success",
      substatus: "201-immediate",
      data: { checkoutId: "chk_123" },
      _reqId: "req_1",
    });

    const result = await createCheckout({ amount: 1000, currency: "USD" });
    expect(result).toEqual({ success: true, checkoutId: "chk_123" });
  });

  it("returns retryable failure for 202-deferred", async () => {
    mockCreate.mockResolvedValue({
      status: "success",
      substatus: "202-deferred",
      _reqId: "req_1",
    });

    const result = await createCheckout({ amount: 1000, currency: "USD" });
    expect(result).toEqual({
      success: false,
      retryable: true,
      code: "deferred",
      message: "Checkout creation deferred. Please retry.",
    });
  });

  it("returns retryable failure for 503-retry", async () => {
    mockCreate.mockResolvedValue({
      status: "failure",
      substatus: "503-retry",
      message: "Service unavailable",
      _reqId: "req_1",
    });

    const result = await createCheckout({ amount: 1000, currency: "USD" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryable).toBe(true);
    }
  });

  it("returns retryable for 502-fraud at creation (false positive)", async () => {
    mockCreate.mockResolvedValue({
      status: "failure",
      substatus: "502-fraud",
      message: "Fraud detected",
      _reqId: "req_1",
    });

    const result = await createCheckout({ amount: 1000, currency: "USD" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryable).toBe(true);
      expect(result.code).toBe("transient");
    }
  });

  it("returns non-retryable for 501-not-supported", async () => {
    mockCreate.mockResolvedValue({
      status: "failure",
      substatus: "501-not-supported",
      message: "Not supported",
      _reqId: "req_1",
    });

    const result = await createCheckout({ amount: 1000, currency: "USD" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryable).toBe(false);
    }
  });

  it("returns retryable on SDK exception", async () => {
    mockCreate.mockRejectedValue(new Error("Network error"));

    const result = await createCheckout({ amount: 1000, currency: "USD" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryable).toBe(true);
      expect(result.code).toBe("sdk_error");
    }
  });

  it("returns non-retryable for unexpected response", async () => {
    mockCreate.mockResolvedValue({
      status: "unknown",
      substatus: "999-weird",
      _reqId: "req_1",
    });

    const result = await createCheckout({ amount: 1000, currency: "USD" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryable).toBe(false);
      expect(result.code).toBe("unknown");
    }
  });

  it("formats customerId without hyphens and with o-prefix", async () => {
    mockCreate.mockResolvedValue({
      status: "success",
      substatus: "201-immediate",
      data: { checkoutId: "chk_123" },
      _reqId: "req_1",
    });

    await createCheckout({
      amount: 1000,
      currency: "USD",
      orderId: "550e8400-e29b-41d4-a716-446655440000",
    });

    const call = mockCreate.mock.calls[0][0];
    expect(call.customerId).toBe("o550e8400e29b41d4a716446655440000");
    expect(call.customerId.length).toBe(33);
    expect(call.customerId).not.toContain("-");
  });
});

describe("confirmCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paid for 201-immediate", async () => {
    mockConfirm.mockResolvedValue({
      status: "success",
      substatus: "201-immediate",
      data: { confirmationId: "conf_123", amount: 1000, currency: "USD" },
      _reqId: "req_1",
    });

    const result = await confirmCheckout({ checkoutId: "chk_123", paymentToken: "tok_abc" });
    expect(result).toEqual({
      status: "paid",
      confirmationId: "conf_123",
      amount: 1000,
      currency: "USD",
    });
  });

  it("returns processing for 202-deferred", async () => {
    mockConfirm.mockResolvedValue({
      status: "success",
      substatus: "202-deferred",
      _reqId: "req_1",
    });

    const result = await confirmCheckout({ checkoutId: "chk_123", paymentToken: "tok_abc" });
    expect(result).toEqual({ status: "processing" });
  });

  it("returns fraud_rejected for 502-fraud", async () => {
    mockConfirm.mockResolvedValue({
      status: "failure",
      substatus: "502-fraud",
      message: "Fraud detected",
      _reqId: "req_1",
    });

    const result = await confirmCheckout({ checkoutId: "chk_123", paymentToken: "tok_abc" });
    expect(result).toEqual({ status: "fraud_rejected", message: "Fraud detected" });
  });

  it("returns failed retryable for 503-retry", async () => {
    mockConfirm.mockResolvedValue({
      status: "failure",
      substatus: "503-retry",
      message: "Retry later",
      _reqId: "req_1",
    });

    const result = await confirmCheckout({ checkoutId: "chk_123", paymentToken: "tok_abc" });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.retryable).toBe(true);
    }
  });

  it("returns failed non-retryable for other failures", async () => {
    mockConfirm.mockResolvedValue({
      status: "failure",
      substatus: "500-error",
      message: "Internal error",
      _reqId: "req_1",
    });

    const result = await confirmCheckout({ checkoutId: "chk_123", paymentToken: "tok_abc" });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.retryable).toBe(false);
    }
  });

  it("returns failed retryable on SDK exception", async () => {
    mockConfirm.mockRejectedValue(new Error("Network error"));

    const result = await confirmCheckout({ checkoutId: "chk_123", paymentToken: "tok_abc" });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.retryable).toBe(true);
    }
  });
});

describe("registerWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on success", async () => {
    mockCreateEndpoint.mockResolvedValue(true);
    expect(await registerWebhook("https://example.com/webhook")).toBe(true);
  });

  it("returns false on failure", async () => {
    mockCreateEndpoint.mockRejectedValue(new Error("Failed"));
    expect(await registerWebhook("https://example.com/webhook")).toBe(false);
  });
});
