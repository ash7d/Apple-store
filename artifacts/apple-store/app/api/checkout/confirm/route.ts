import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { markOrderPaid } from "@/lib/checkout-orders";
import { stripeApi } from "@/lib/stripe";
import Order from "@/models/Order";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to confirm this order." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Checkout session is missing." }, { status: 400 });
  }
  const sessionId =
    typeof body === "object" && body !== null && "sessionId" in body
      ? (body as { sessionId?: unknown }).sessionId
      : null;
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Checkout session is invalid." }, { status: 400 });
  }

  try {
    const session = await stripeApi<Stripe.Checkout.Session>(
      `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      "GET",
    );
    const orderId = session.metadata?.orderId;
    if (!orderId || session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: "This checkout does not belong to your account." }, { status: 403 });
    }

    const updated = await markOrderPaid(orderId, session, user.id);
    if (!updated) {
      await connectToDatabase();
      const order = await Order.findById(orderId).exec();
      if (order?.status === "pending" && session.payment_status !== "paid") {
        return NextResponse.json({ paid: false, status: "pending" });
      }
      return NextResponse.json(
        { error: "Payment could not be verified for this order." },
        { status: 409 },
      );
    }

    return NextResponse.json({ paid: true, orderId });
  } catch {
    return NextResponse.json(
      { error: "We could not verify payment yet. Your order will update when Stripe confirms it." },
      { status: 503 },
    );
  }
}
