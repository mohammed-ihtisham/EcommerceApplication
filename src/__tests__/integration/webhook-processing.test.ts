/**
 * Integration-style tests for webhook processing via the API route.
 * Tests the full webhook flow: receive event -> find payment -> update state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Shared state for in-memory DB
const webhookEvents: Record<string, any> = {};
const paymentAttempts: Record<number, any> = {};
const orders: Record<string, any> = {};

function resetDb() {
  for (const key of Object.keys(webhookEvents)) delete webhookEvents[key];
  for (const key of Object.keys(paymentAttempts))
    delete paymentAttempts[Number(key)];
  for (const key of Object.keys(orders)) delete orders[key];
}

function seedOrder(
  id: string,
  status: string,
  paStatus: string,
  checkoutId: string
) {
  orders[id] = {
    id,
    publicOrderId: "VIR-TEST01",
    status,
    currency: "USD",
    subtotalAmount: 3250,
    version: 0,
  };
  paymentAttempts[1] = {
    id: 1,
    orderId: id,
    status: paStatus,
    providerCheckoutId: checkoutId,
    idempotencyKey: "idk-1",
    amount: 3250,
    currency: "USD",
    version: 0,
    order: orders[id],
  };
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEvent: {
      findUnique: vi.fn(async ({ where }: any) => {
        return webhookEvents[where.providerEventId] ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const event = { id: Object.keys(webhookEvents).length + 1, ...data };
        webhookEvents[data.providerEventId] = event;
        return event;
      }),
    },
    $transaction: vi.fn(async (fn: any) =>
      fn({
        paymentAttempt: {
          findUnique: async ({ where }: any) =>
            paymentAttempts[where.id] ?? null,
          updateMany: async ({ where, data }: any) => {
            const pa = paymentAttempts[where.id];
            if (!pa || pa.version !== where.version) return { count: 0 };
            if (data.status) pa.status = data.status;
            if (data.providerCheckoutId)
              pa.providerCheckoutId = data.providerCheckoutId;
            if (data.version?.increment)
              pa.version += data.version.increment;
            return { count: 1 };
          },
        },
        order: {
          findUnique: async ({ where }: any) => orders[where.id] ?? null,
          updateMany: async ({ where, data }: any) => {
            const order = orders[where.id];
            if (!order || order.version !== where.version)
              return { count: 0 };
            if (data.status) order.status = data.status;
            if (data.version?.increment)
              order.version += data.version.increment;
            return { count: 1 };
          },
        },
      })
    ),
  },
}));

vi.mock("@/server/orders/orderQueries", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/orders/orderQueries")>();
  return {
    ...actual,
    findPaymentAttemptByCheckoutId: vi.fn(
      async (checkoutId: string) => {
        const match = Object.values(paymentAttempts).find(
          (pa: any) => pa.providerCheckoutId === checkoutId
        );
        return match ?? null;
      }
    ),
    findPaymentAttemptByOrderId: vi.fn(async (orderId: string) => {
      const match = Object.values(paymentAttempts).find(
        (pa: any) => pa.orderId === orderId
      );
      return match ?? null;
    }),
    updatePaymentAndOrderStatus: vi.fn(
      async (
        paId: number,
        paStatus: string,
        orderId: string,
        orderStatus: string,
        extra?: any
      ) => {
        const pa = paymentAttempts[paId];
        const order = orders[orderId];
        if (pa) {
          pa.status = paStatus;
          if (extra?.providerPaymentId)
            pa.providerPaymentId = extra.providerPaymentId;
          if (extra?.failureMessage)
            pa.failureMessage = extra.failureMessage;
        }
        if (order) order.status = orderStatus;
      }
    ),
  };
});

import { POST } from "@/app/api/payments/webhook/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/payments/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Integration: Webhook Processing", () => {
  beforeEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  it("processing -> webhook checkout.confirm.success -> order becomes paid", async () => {
    seedOrder("order-1", "payment_processing", "processing", "chk_wh_1");

    const res = await POST(
      makeRequest({
        uid: "evt_success_1",
        type: "checkout.confirm.success",
        data: {
          checkoutId: "chk_wh_1",
          confirmationId: "conf_wh_001",
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);

    // Verify state transitions
    expect(orders["order-1"].status).toBe("paid");
    expect(paymentAttempts[1].status).toBe("succeeded");
  });

  it("processing -> webhook checkout.confirm.failure -> order becomes payment_failed", async () => {
    seedOrder("order-2", "payment_processing", "processing", "chk_wh_2");

    const res = await POST(
      makeRequest({
        uid: "evt_fail_1",
        type: "checkout.confirm.failure",
        data: {
          checkoutId: "chk_wh_2",
          message: "Card declined",
        },
      })
    );

    expect(res.status).toBe(200);
    expect(orders["order-2"].status).toBe("payment_failed");
    expect(paymentAttempts[1].status).toBe("failed");
  });

  it("webhook with fraud reason -> order becomes fraud_rejected", async () => {
    seedOrder("order-3", "payment_processing", "processing", "chk_wh_3");

    const res = await POST(
      makeRequest({
        uid: "evt_fraud_1",
        type: "checkout.confirm.failure",
        data: {
          checkoutId: "chk_wh_3",
          reason: "fraud",
          message: "Suspected fraud",
        },
      })
    );

    expect(res.status).toBe(200);
    expect(orders["order-3"].status).toBe("fraud_rejected");
    expect(paymentAttempts[1].status).toBe("fraud_rejected");
  });

  it("duplicate webhook is ignored", async () => {
    seedOrder("order-4", "payment_processing", "processing", "chk_wh_4");

    // First webhook
    await POST(
      makeRequest({
        uid: "evt_dup_1",
        type: "checkout.confirm.success",
        data: { checkoutId: "chk_wh_4", confirmationId: "conf_wh_dup" },
      })
    );

    // Second webhook with same uid
    const res = await POST(
      makeRequest({
        uid: "evt_dup_1",
        type: "checkout.confirm.success",
        data: { checkoutId: "chk_wh_4", confirmationId: "conf_wh_dup" },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.duplicate).toBe(true);
  });

  it("webhook for unknown checkoutId returns received without error", async () => {
    const res = await POST(
      makeRequest({
        uid: "evt_unknown_1",
        type: "checkout.confirm.success",
        data: { checkoutId: "chk_does_not_exist" },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });
});
