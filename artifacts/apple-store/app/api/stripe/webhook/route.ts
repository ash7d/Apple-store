import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { expirePendingOrder, markOrderPaid } from "@/lib/checkout-orders";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());
  let stripe: Awaited<ReturnType<typeof getStripeClient>>;
  let webhookSecret: string;
  try {
    [stripe, webhookSecret] = await Promise.all([
      getStripeClient(),
      getStripeWebhookSecret(),
    ]);
  } catch {
    return NextResponse.json(
      { error: "Stripe webhook credentials are not configured for this environment." },
      { status: 503 },
    );
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Stripe signature is invalid." }, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const checkoutSession = event.data.object;
      const orderId = checkoutSession.metadata?.orderId;
      if (!orderId || !Types.ObjectId.isValid(orderId)) {
        return NextResponse.json({ error: "Checkout event has no valid order." }, { status: 400 });
      }
      await connectToDatabase();
      const paid = await markOrderPaid(orderId, checkoutSession);
      if (!paid) {
        return NextResponse.json({ error: "Order could not be matched to this payment." }, { status: 409 });
      }
    } else if (event.type === "checkout.session.expired") {
      const checkoutSession = event.data.object;
      const orderId = checkoutSession.metadata?.orderId;
      if (orderId && Types.ObjectId.isValid(orderId)) {
        await expirePendingOrder(orderId, checkoutSession.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Stripe event could not be processed." }, { status: 500 });
  }
}
