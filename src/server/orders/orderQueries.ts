import { prisma } from "@/lib/prisma";
import type { OrderStatus, PaymentAttemptStatus } from "./stateMachine";
import { canTransitionOrder, canTransitionPayment } from "./stateMachine";
import { logger } from "@/lib/logger";

export class ConcurrentModificationError extends Error {
  constructor(entity: string, id: string | number) {
    super(`Concurrent modification detected on ${entity} ${id}`);
    this.name = "ConcurrentModificationError";
  }
}

export async function findOrderByPublicId(publicOrderId: string) {
  return prisma.order.findUnique({
    where: { publicOrderId },
    include: { items: true, paymentAttempts: true },
  });
}

export async function findOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true, paymentAttempts: true },
  });
}

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error(`Order ${orderId} not found`);

  const currentStatus = order.status as OrderStatus;
  if (!canTransitionOrder(currentStatus, newStatus)) {
    logger.warn("Invalid order status transition", {
      orderId,
      from: currentStatus,
      to: newStatus,
    });
    return null;
  }

  const result = await prisma.order.updateMany({
    where: { id: orderId, version: order.version },
    data: { status: newStatus, version: { increment: 1 } },
  });

  if (result.count === 0) {
    throw new ConcurrentModificationError("Order", orderId);
  }

  return prisma.order.findUnique({ where: { id: orderId } });
}

export async function updatePaymentAttemptStatus(
  paymentAttemptId: number,
  newStatus: PaymentAttemptStatus,
  extra?: {
    providerPaymentId?: string;
    failureCode?: string;
    failureMessage?: string;
  }
) {
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: paymentAttemptId },
  });
  if (!attempt) throw new Error(`PaymentAttempt ${paymentAttemptId} not found`);

  const currentStatus = attempt.status as PaymentAttemptStatus;
  if (!canTransitionPayment(currentStatus, newStatus)) {
    logger.warn("Invalid payment status transition", {
      paymentAttemptId,
      from: currentStatus,
      to: newStatus,
    });
    return null;
  }

  const result = await prisma.paymentAttempt.updateMany({
    where: { id: paymentAttemptId, version: attempt.version },
    data: {
      status: newStatus,
      version: { increment: 1 },
      ...(extra?.providerPaymentId && { providerPaymentId: extra.providerPaymentId }),
      ...(extra?.failureCode && { failureCode: extra.failureCode }),
      ...(extra?.failureMessage && { failureMessage: extra.failureMessage }),
    },
  });

  if (result.count === 0) {
    throw new ConcurrentModificationError("PaymentAttempt", paymentAttemptId);
  }

  return prisma.paymentAttempt.findUnique({ where: { id: paymentAttemptId } });
}

/**
 * Atomically update both payment attempt and order status in a single transaction.
 * Uses optimistic locking to detect concurrent modifications.
 */
export async function updatePaymentAndOrderStatus(
  paymentAttemptId: number,
  paymentStatus: PaymentAttemptStatus,
  orderId: string,
  orderStatus: OrderStatus,
  extra?: {
    providerPaymentId?: string;
    providerCheckoutId?: string;
    failureCode?: string;
    failureMessage?: string;
  }
) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({ where: { id: paymentAttemptId } });
    if (!attempt) throw new Error(`PaymentAttempt ${paymentAttemptId} not found`);

    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Order ${orderId} not found`);

    const currentPaymentStatus = attempt.status as PaymentAttemptStatus;
    if (!canTransitionPayment(currentPaymentStatus, paymentStatus)) {
      logger.warn("Invalid payment status transition (transactional)", {
        paymentAttemptId,
        from: currentPaymentStatus,
        to: paymentStatus,
      });
      return null;
    }

    const currentOrderStatus = order.status as OrderStatus;
    if (!canTransitionOrder(currentOrderStatus, orderStatus)) {
      logger.warn("Invalid order status transition (transactional)", {
        orderId,
        from: currentOrderStatus,
        to: orderStatus,
      });
      return null;
    }

    const paymentResult = await tx.paymentAttempt.updateMany({
      where: { id: paymentAttemptId, version: attempt.version },
      data: {
        status: paymentStatus,
        version: { increment: 1 },
        ...(extra?.providerPaymentId && { providerPaymentId: extra.providerPaymentId }),
        ...(extra?.providerCheckoutId && { providerCheckoutId: extra.providerCheckoutId }),
        ...(extra?.failureCode && { failureCode: extra.failureCode }),
        ...(extra?.failureMessage && { failureMessage: extra.failureMessage }),
      },
    });

    if (paymentResult.count === 0) {
      throw new ConcurrentModificationError("PaymentAttempt", paymentAttemptId);
    }

    const orderResult = await tx.order.updateMany({
      where: { id: orderId, version: order.version },
      data: { status: orderStatus, version: { increment: 1 } },
    });

    if (orderResult.count === 0) {
      throw new ConcurrentModificationError("Order", orderId);
    }

    return {
      paymentAttempt: await tx.paymentAttempt.findUnique({ where: { id: paymentAttemptId } }),
      order: await tx.order.findUnique({ where: { id: orderId } }),
    };
  });
}

export async function findPaymentAttemptByCheckoutId(providerCheckoutId: string) {
  return prisma.paymentAttempt.findFirst({
    where: { providerCheckoutId },
    include: { order: true },
  });
}

export async function findPaymentAttemptByOrderId(orderId: string) {
  return prisma.paymentAttempt.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    include: { order: true },
  });
}
