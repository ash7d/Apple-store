"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../../../components/store-provider";
import { trackEvent } from "../../../lib/analytics";

type ConfirmationState = "loading" | "paid" | "pending" | "error";

export default function CheckoutConfirmation({ sessionId }: { sessionId: string }) {
  const { clearCart } = useStore();
  const [state, setState] = useState<ConfirmationState>("loading");
  const [message, setMessage] = useState("");
  const completionTracked = useRef(false);

  async function confirmPayment() {
    if (!sessionId) {
      setState("error");
      setMessage("The checkout reference is missing. Check your orders or contact the store.");
      return;
    }

    setState("loading");
    try {
      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const result = (await response.json()) as {
        paid?: boolean;
        status?: string;
        error?: string;
      };
      if (response.ok && result.paid) {
        clearCart();
        setState("paid");
        if (!completionTracked.current) {
          completionTracked.current = true;
          trackEvent("checkout_completed");
        }
        return;
      }
      if (response.ok && result.status === "pending") {
        setState("pending");
        setMessage("Stripe is still confirming your payment. Your order will update shortly.");
        return;
      }
      setState("error");
      setMessage(result.error || "We could not confirm payment yet.");
    } catch {
      setState("error");
      setMessage("We could not confirm payment right now. Check your orders in a moment.");
    }
  }

  useEffect(() => {
    void confirmPayment();
  }, [sessionId]);

  return (
    <main className="page-wrap checkout-result">
      <span className="eyebrow">Apple Store</span>
      {state === "loading" ? (
        <>
          <h1>Confirming your order.</h1>
          <p>We’re checking your payment securely with Stripe.</p>
          <div className="skeleton" aria-label="Confirming payment" />
        </>
      ) : state === "paid" ? (
        <>
          <h1>Thank you.</h1>
          <p>Your payment is confirmed. Your order is now in your account.</p>
          <div className="checkout-result-actions">
            <Link className="pill" href="/orders">View your orders</Link>
            <Link className="text-link" href="/products">Continue browsing</Link>
          </div>
        </>
      ) : (
        <>
          <h1>{state === "pending" ? "Payment is processing." : "We’re checking your order."}</h1>
          <p role={state === "error" ? "alert" : undefined}>{message}</p>
          <div className="checkout-result-actions">
            <button className="pill" type="button" onClick={() => void confirmPayment()}>
              Check again
            </button>
            <Link className="text-link" href="/orders">View your orders</Link>
          </div>
        </>
      )}
    </main>
  );
}
