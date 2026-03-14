import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import type { ValidatedCart } from "./cartService";
import { logger } from "@/lib/logger";

function generatePublicOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "VIR-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createOrder(cart: ValidatedCart) {
  const orderId = uuidv4();
  const publicOrderId = generatePublicOrderId();
  const idempotencyKey = uuidv4();

  logger.info("Creating order", { orderId, publicOrderId, currency: cart.currency });

  const order = await prisma.order.create({
    data: {
      id: orderId,
      publicOrderId,
      status: "checkout_draft",
      currency: cart.currency,
      subtotalAmount: cart.subtotal,
      items: {
        create: cart.items.map((item) => ({
          productId: item.product.id,
          productNameSnapshot: item.product.name,
          productImageSnapshot: item.product.imgUrl,
          unitAmountSnapshot: item.product.amount,
          currencySnapshot: item.product.currency,
          quantity: item.quantity,
          lineTotalAmount: item.lineTotal,
        })),
      },
      paymentAttempts: {
        create: {
          idempotencyKey,
          amount: cart.subtotal,
          currency: cart.currency,
          status: "created",
        },
      },
    },
    include: {
      items: true,
      paymentAttempts: true,
    },
  });

  return order;
}

export async function getOrderForStatusPage(publicOrderId: string) {
  const order = await prisma.order.findUnique({
    where: { publicOrderId },
    include: {
      items: true,
      paymentAttempts: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!order) return null;

  return {
    publicOrderId: order.publicOrderId,
    status: order.status,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount,
    items: order.items.map((item) => ({
      productName: item.productNameSnapshot,
      productImage: item.productImageSnapshot,
      unitAmount: item.unitAmountSnapshot,
      currency: item.currencySnapshot,
      quantity: item.quantity,
      lineTotal: item.lineTotalAmount,
    })),
    createdAt: order.createdAt.toISOString(),
  };
}
