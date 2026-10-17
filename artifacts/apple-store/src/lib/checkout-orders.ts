import mongoose, { Types } from "mongoose";
import type Stripe from "stripe";
import { connectToDatabase } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";

type CheckoutOrderRuntime = {
  connectToDatabase: typeof connectToDatabase;
  Order: typeof Order;
  Product: typeof Product;
  startSession: typeof mongoose.startSession;
};

const defaultRuntime: CheckoutOrderRuntime = {
  connectToDatabase,
  Order,
  Product,
  startSession: () => mongoose.startSession(),
};

export async function markOrderPaid(
  orderId: string,
  checkoutSession: Stripe.Checkout.Session,
  expectedUserId?: string,
  runtime: CheckoutOrderRuntime = defaultRuntime,
) {
  if (!Types.ObjectId.isValid(orderId)) return false;
  await runtime.connectToDatabase();

  const order = await runtime.Order.findById(orderId).exec();
  if (!order) return false;
  if (
    checkoutSession.payment_status !== "paid" ||
    checkoutSession.amount_total !== Math.round(order.total * 100) ||
    checkoutSession.currency?.toLowerCase() !== order.currency
  ) {
    return false;
  }
  const metadataUserId = checkoutSession.metadata?.userId;
  if (
    !metadataUserId ||
    metadataUserId !== order.user.toString() ||
    (expectedUserId !== undefined && metadataUserId !== expectedUserId)
  ) {
    return false;
  }
  if (order.status === "paid") {
    return order.stripeSessionId === checkoutSession.id;
  }
  if (order.status !== "pending") return false;
  if (order.stripeSessionId && order.stripeSessionId !== checkoutSession.id) return false;

  const paymentIntentId =
    typeof checkoutSession.payment_intent === "string"
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id ?? null;

  const updated = await runtime.Order.findOneAndUpdate(
    {
      _id: order._id,
      status: "pending",
      $or: [
        { stripeSessionId: checkoutSession.id },
        { stripeSessionId: null },
        { stripeSessionId: { $exists: false } },
      ],
    },
    {
      $set: {
        status: "paid",
        stripeSessionId: checkoutSession.id,
        stripePaymentIntentId: paymentIntentId,
        inventoryReserved: false,
      },
    },
    { new: true },
  ).exec();

  return Boolean(updated);
}

export async function expirePendingOrder(
  orderId: string,
  stripeSessionId?: string,
  runtime: CheckoutOrderRuntime = defaultRuntime,
) {
  if (!Types.ObjectId.isValid(orderId)) return false;
  await runtime.connectToDatabase();

  const mongoSession = await runtime.startSession();
  let expired = false;

  try {
    await mongoSession.withTransaction(async () => {
      const filter: Record<string, unknown> = {
        _id: new Types.ObjectId(orderId),
        status: "pending",
      };
      if (stripeSessionId) {
        filter.$or = [
          { stripeSessionId },
          { stripeSessionId: null },
          { stripeSessionId: { $exists: false } },
        ];
      }

      const order = await runtime.Order.findOne(filter).session(mongoSession).exec();
      if (!order) {
        const alreadyExpired = await runtime.Order.exists({
          _id: new Types.ObjectId(orderId),
          status: "expired",
        }).session(mongoSession);
        expired = Boolean(alreadyExpired);
        return;
      }

      if (order.inventoryReserved) {
        for (const item of order.items) {
          const restored = await runtime.Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } },
            { session: mongoSession },
          ).exec();
          if (restored.matchedCount !== 1) {
            throw new Error("A reserved product was not found while releasing stock.");
          }
        }
      }

      await runtime.Order.updateOne(
        { _id: order._id, status: "pending" },
        { $set: { status: "expired", inventoryReserved: false } },
        { session: mongoSession },
      ).exec();
      expired = true;
    });
  } finally {
    await mongoSession.endSession();
  }

  return expired;
}
