import { prisma } from "@/lib/prisma";
import type { OrderStatus, PaymentAttemptStatus } from "./stateMachine";
import { canTransitionOrder, canTransitionPayment } from "./stateMachine";
import { logger } from "@/lib/logger";

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

  return prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });
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

  return prisma.paymentAttempt.update({
    where: { id: paymentAttemptId },
    data: {
      status: newStatus,
      ...(extra?.providerPaymentId && { providerPaymentId: extra.providerPaymentId }),
      ...(extra?.failureCode && { failureCode: extra.failureCode }),
      ...(extra?.failureMessage && { failureMessage: extra.failureMessage }),
    },
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
