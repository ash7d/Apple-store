import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { expirePendingOrder } from "@/lib/checkout-orders";
import { ensureStripePrice, getPublicAppUrl, stripeApi } from "@/lib/stripe";
import Order from "@/models/Order";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ShippingAddressInput = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

type CartLineInput = { productId: string; quantity: number };

function parseCart(value: unknown): CartLineInput[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return null;

  const quantities = new Map<string, number>();
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const record = item as Record<string, unknown>;
    if (
      typeof record.productId !== "string" ||
      !Types.ObjectId.isValid(record.productId) ||
      !Number.isInteger(record.quantity) ||
      (record.quantity as number) < 1 ||
      (record.quantity as number) > 99
    ) {
      return null;
    }
    quantities.set(
      record.productId,
      (quantities.get(record.productId) ?? 0) + (record.quantity as number),
    );
  }

  const lines = Array.from(quantities, ([productId, quantity]) => ({
    productId,
    quantity,
  }));
  return lines.length <= 20 && lines.every((line) => line.quantity <= 99)
    ? lines
    : null;
}

function parseShippingAddress(value: unknown): ShippingAddressInput | null {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  const fields = ["name", "email", "address1", "city", "region", "postalCode", "country"];
  for (const field of fields) {
    if (typeof input[field] !== "string" || !input[field].trim()) return null;
  }

  const address: ShippingAddressInput = {
    name: String(input.name).trim(),
    email: String(input.email).trim().toLowerCase(),
    phone: typeof input.phone === "string" ? input.phone.trim() : "",
    address1: String(input.address1).trim(),
    address2: typeof input.address2 === "string" ? input.address2.trim() : "",
    city: String(input.city).trim(),
    region: String(input.region).trim(),
    postalCode: String(input.postalCode).trim(),
    country: String(input.country).trim(),
  };
  const limits: Array<[keyof ShippingAddressInput, number]> = [
    ["name", 120],
    ["email", 254],
    ["phone", 40],
    ["address1", 200],
    ["address2", 200],
    ["city", 120],
    ["region", 120],
    ["postalCode", 40],
    ["country", 80],
  ];
  if (limits.some(([field, max]) => address[field].length > max)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) return null;
  return address;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in before starting checkout." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid checkout details." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Enter valid checkout details." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const cart = parseCart(input.items);
  const shippingAddress = parseShippingAddress(input.shippingAddress);
  if (!cart || !shippingAddress) {
    return NextResponse.json(
      { error: "Check your bag and shipping details, then try again." },
      { status: 400 },
    );
  }

  await connectToDatabase();
  const products = await Product.find({
    _id: { $in: cart.map((line) => new Types.ObjectId(line.productId)) },
  }).exec();
  const productsById = new Map(products.map((product) => [product._id.toString(), product]));
  if (productsById.size !== cart.length) {
    return NextResponse.json(
      { error: "One or more products are no longer available." },
      { status: 409 },
    );
  }

  const prepared: Array<{
    product: (typeof products)[number];
    quantity: number;
    priceId: string;
    amountCents: number;
  }> = [];
  try {
    for (const line of cart) {
      const product = productsById.get(line.productId);
      if (!product || product.stock < line.quantity) {
        return NextResponse.json(
          { error: `${product?.name ?? "A product"} has insufficient stock.` },
          { status: 409 },
        );
      }
      const amountCents = Math.round(product.price * 100);
      const priceId = await ensureStripePrice(product);
      prepared.push({ product, quantity: line.quantity, priceId, amountCents });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("changed during checkout")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Payments are temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }

  const totalCents = prepared.reduce(
    (sum, item) => sum + item.amountCents * item.quantity,
    0,
  );
  if (!Number.isSafeInteger(totalCents) || totalCents < 1) {
    return NextResponse.json({ error: "Your bag total is invalid." }, { status: 400 });
  }

  let order: Awaited<ReturnType<typeof Order.create>>[number] | null = null;
  const mongoSession = await Product.startSession();
  try {
    order = await mongoSession.withTransaction(async () => {
      for (const item of prepared) {
        const reserved = await Product.updateOne(
          {
            _id: item.product._id,
            stock: { $gte: item.quantity },
            price: item.product.price,
          },
          { $inc: { stock: -item.quantity } },
          { session: mongoSession },
        ).exec();
        if (reserved.matchedCount !== 1) {
          throw new Error("STOCK_CHANGED");
        }
      }

      const [created] = await Order.create(
        [
          {
            user: new Types.ObjectId(user.id),
            items: prepared.map(({ product, quantity }) => ({
              product: product._id,
              name: product.name,
              image: product.image,
              quantity,
              price: Math.round(product.price * 100) / 100,
            })),
            total: totalCents / 100,
            currency: "usd",
            shippingAddress,
            inventoryReserved: true,
            status: "pending",
          },
        ],
        { session: mongoSession },
      );
      return created;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK_CHANGED") {
      return NextResponse.json(
        { error: "Stock changed while you were checking out. Review your bag and try again." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "We could not reserve your items. Please try again." },
      { status: 500 },
    );
  } finally {
    await mongoSession.endSession();
  }

  if (!order) {
    return NextResponse.json({ error: "We could not create your order." }, { status: 500 });
  }

  let sessionCreated = false;
  try {
    const baseUrl = getPublicAppUrl(request);
    const session = await stripeApi<{ id: string; url: string | null }>(
      "/v1/checkout/sessions",
      "POST",
      {
        mode: "payment",
        line_items: prepared.map((item) => ({
          price: item.priceId,
          quantity: item.quantity,
        })),
        customer_email: shippingAddress.email,
        billing_address_collection: "required",
        client_reference_id: order._id.toString(),
        metadata: {
          orderId: order._id.toString(),
          userId: user.id,
        },
        payment_intent_data: {
          metadata: {
            orderId: order._id.toString(),
            userId: user.id,
          },
        },
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout/cancel?order_id=${order._id.toString()}`,
        expires_at: Math.floor(Date.now() / 1000) + 1860,
      },
      `apple-store-order-${order._id.toString()}`,
    );
    sessionCreated = true;

    if (!session.url) {
      await expirePendingOrder(order._id.toString());
      return NextResponse.json(
        { error: "Stripe did not return a checkout link. Please try again." },
        { status: 502 },
      );
    }

    await Order.updateOne(
      { _id: order._id, status: "pending" },
      { $set: { stripeSessionId: session.id } },
    ).exec();

    return NextResponse.json({ url: session.url });
  } catch {
    if (!sessionCreated) {
      await expirePendingOrder(order._id.toString()).catch(() => undefined);
    }
    return NextResponse.json(
      { error: "Checkout could not be started. Your card has not been charged." },
      { status: 502 },
    );
  }
}
