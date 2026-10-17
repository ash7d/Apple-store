import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { Types } from "mongoose";
import {
  expirePendingOrder,
  markOrderPaid,
} from "../src/lib/checkout-orders";

const orderId = new Types.ObjectId();
const userId = new Types.ObjectId().toString();
const sessionId = "cs_test_checkout";

function makeOrder() {
  return {
    _id: orderId,
    user: new Types.ObjectId(userId),
    total: 129.99,
    currency: "usd",
    status: "pending",
    stripeSessionId: sessionId,
    stripePaymentIntentId: null as string | null,
    inventoryReserved: true,
    items: [
      { product: new Types.ObjectId(), quantity: 2 },
      { product: new Types.ObjectId(), quantity: 3 },
    ],
  };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: sessionId,
    payment_status: "paid",
    amount_total: 12999,
    currency: "usd",
    metadata: { orderId: orderId.toString(), userId },
    payment_intent: "pi_test_payment",
    ...overrides,
  } as never;
}

function makeHarness() {
  const order = makeOrder();
  const stocks = new Map(
    order.items.map(({ product }) => [product.toString(), 10]),
  );
  let paidUpdates = 0;
  let orderUpdates = 0;
  const runtime = {
    connectToDatabase: async () => undefined,
    Order: {
      findById: () => ({ exec: async () => order }),
      findOne: () => ({
        session: () => ({
          exec: async () => order.status === "pending" ? order : null,
        }),
      }),
      exists: () => ({
        session: async () => order.status === "expired",
      }),
      findOneAndUpdate: (_filter: unknown, update: any) => ({
        exec: async () => {
          if (order.status !== "pending") return null;
          paidUpdates += 1;
          Object.assign(order, update.$set);
          return order;
        },
      }),
      updateOne: (_filter: unknown, update: any) => ({
        exec: async () => {
          orderUpdates += 1;
          Object.assign(order, update.$set);
          return { matchedCount: 1 };
        },
      }),
    },
    Product: {
      updateOne: (filter: { _id: Types.ObjectId }, update: any) => ({
        exec: async () => {
          const id = filter._id.toString();
          const current = stocks.get(id);
          if (current === undefined) return { matchedCount: 0 };
          stocks.set(id, current + update.$inc.stock);
          return { matchedCount: 1 };
        },
      }),
    },
    startSession: async () => ({
      withTransaction: async (callback: () => Promise<void>) => callback(),
      endSession: async () => undefined,
    }),
  } as unknown as Parameters<typeof markOrderPaid>[3];

  return {
    order,
    stocks,
    runtime,
    get paidUpdates() {
      return paidUpdates;
    },
    get orderUpdates() {
      return orderUpdates;
    },
  };
}

describe("checkout payment settlement", () => {
  let harness: ReturnType<typeof makeHarness>;

  beforeEach(() => {
    harness = makeHarness();
  });

  it("marks a matching paid session as paid and accepts its repeated delivery", async () => {
    const session = makeSession();

    assert.equal(await markOrderPaid(orderId.toString(), session, userId, harness.runtime), true);
    assert.equal(harness.order.status, "paid");
    assert.equal(harness.order.inventoryReserved, false);
    assert.equal(harness.order.stripePaymentIntentId, "pi_test_payment");

    // Stripe may redeliver the same completion event; this must be idempotent.
    assert.equal(await markOrderPaid(orderId.toString(), session, userId, harness.runtime), true);
    assert.equal(harness.paidUpdates, 1);
  });

  it("rejects user metadata that does not match the order owner", async () => {
    const session = makeSession({
      metadata: { orderId: orderId.toString(), userId: new Types.ObjectId().toString() },
    });

    assert.equal(await markOrderPaid(orderId.toString(), session, undefined, harness.runtime), false);
    assert.equal(harness.order.status, "pending");
    assert.equal(harness.paidUpdates, 0);
  });

  it("rejects a confirmation requested by a different signed-in user", async () => {
    assert.equal(
      await markOrderPaid(orderId.toString(), makeSession(), new Types.ObjectId().toString(), harness.runtime),
      false,
    );
    assert.equal(harness.order.status, "pending");
    assert.equal(harness.paidUpdates, 0);
  });

  it("rejects amount and currency mismatches", async () => {
    assert.equal(
      await markOrderPaid(orderId.toString(), makeSession({ amount_total: 12998 }), userId, harness.runtime),
      false,
    );
    assert.equal(
      await markOrderPaid(orderId.toString(), makeSession({ currency: "eur" }), userId, harness.runtime),
      false,
    );
    assert.equal(harness.order.status, "pending");
    assert.equal(harness.paidUpdates, 0);
  });

  it("restores every reserved quantity once when an expired session is delivered repeatedly", async () => {
    const initialStocks = [...harness.stocks.values()];

    assert.equal(await expirePendingOrder(orderId.toString(), sessionId, harness.runtime), true);
    assert.deepEqual(
      [...harness.stocks.values()],
      initialStocks.map((stock, index) => stock + harness.order.items[index].quantity),
    );
    assert.equal(harness.order.status, "expired");
    assert.equal(harness.order.inventoryReserved, false);

    // A duplicate expiry event sees a non-pending order and must not restock again.
    assert.equal(await expirePendingOrder(orderId.toString(), sessionId, harness.runtime), true);
    assert.deepEqual(
      [...harness.stocks.values()],
      initialStocks.map((stock, index) => stock + harness.order.items[index].quantity),
    );
    assert.equal(harness.orderUpdates, 1);
  });
});
