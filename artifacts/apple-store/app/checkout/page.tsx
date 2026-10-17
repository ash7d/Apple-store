"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useStore } from "../../components/store-provider";
import { trackEvent } from "../../lib/analytics";

type AddressForm = {
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

const emptyAddress: AddressForm = {
  name: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};

export default function CheckoutPage() {
  const { cart, user, authLoading } = useStore();
  const [address, setAddress] = useState<AddressForm>(emptyAddress);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  function updateAddress(field: keyof AddressForm, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
  }

  async function startCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !cart.length || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
          })),
          shippingAddress: address,
        }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Checkout could not be started.");
      }
      trackEvent("checkout_started");
      window.location.assign(result.url);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Checkout could not be started. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="page-wrap">
      <header className="page-title">
        <span className="eyebrow">Almost yours</span>
        <h1>Delivery details.</h1>
        <p>Tell us where to send your selection. Payment happens securely with Stripe.</p>
      </header>

      {authLoading ? (
        <div className="skeleton" aria-label="Loading account" />
      ) : !user ? (
        <div className="empty-state">
          <h2>Sign in to continue.</h2>
          <p>Your orders are saved with your account. Your bag will stay on this device.</p>
          <Link className="pill" href="/login">Sign in</Link>
        </div>
      ) : !cart.length ? (
        <div className="empty-state">
          <h2>Your bag is empty.</h2>
          <p>Choose something you love and it will be waiting here.</p>
          <Link className="pill" href="/products">Explore products</Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={startCheckout}>
            <section className="checkout-section" aria-labelledby="delivery-heading">
              <span className="eyebrow">Worldwide delivery</span>
              <h2 id="delivery-heading">Where should we send it?</h2>
              <div className="checkout-fields">
                <label className="checkout-field checkout-field-wide">
                  <span>Full name</span>
                  <input
                    autoComplete="name"
                    maxLength={120}
                    required
                    value={address.name || user.name}
                    onChange={(event) => updateAddress("name", event.target.value)}
                  />
                </label>
                <label className="checkout-field">
                  <span>Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    value={address.email || user.email}
                    onChange={(event) => updateAddress("email", event.target.value)}
                  />
                </label>
                <label className="checkout-field">
                  <span>Phone <em>Optional</em></span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    maxLength={40}
                    value={address.phone}
                    onChange={(event) => updateAddress("phone", event.target.value)}
                  />
                </label>
                <label className="checkout-field checkout-field-wide">
                  <span>Address</span>
                  <input
                    autoComplete="address-line1"
                    maxLength={200}
                    required
                    value={address.address1}
                    onChange={(event) => updateAddress("address1", event.target.value)}
                  />
                </label>
                <label className="checkout-field checkout-field-wide">
                  <span>Apartment, suite, etc. <em>Optional</em></span>
                  <input
                    autoComplete="address-line2"
                    maxLength={200}
                    value={address.address2}
                    onChange={(event) => updateAddress("address2", event.target.value)}
                  />
                </label>
                <label className="checkout-field">
                  <span>City</span>
                  <input
                    autoComplete="address-level2"
                    maxLength={120}
                    required
                    value={address.city}
                    onChange={(event) => updateAddress("city", event.target.value)}
                  />
                </label>
                <label className="checkout-field">
                  <span>State, province, or region</span>
                  <input
                    autoComplete="address-level1"
                    maxLength={120}
                    required
                    value={address.region}
                    onChange={(event) => updateAddress("region", event.target.value)}
                  />
                </label>
                <label className="checkout-field">
                  <span>Postal code</span>
                  <input
                    autoComplete="postal-code"
                    maxLength={40}
                    required
                    value={address.postalCode}
                    onChange={(event) => updateAddress("postalCode", event.target.value)}
                  />
                </label>
                <label className="checkout-field">
                  <span>Country or region</span>
                  <input
                    autoComplete="country-name"
                    maxLength={80}
                    required
                    value={address.country}
                    onChange={(event) => updateAddress("country", event.target.value)}
                    placeholder="Enter your country"
                  />
                </label>
              </div>
            </section>

            {error ? (
              <div className="notice error checkout-error" role="alert">
                {error} {error.toLowerCase().includes("sign in") && <Link href="/login">Sign in</Link>}
              </div>
            ) : null}
            <div className="checkout-actions">
              <Link href="/cart" className="text-link">Back to bag</Link>
              <button className="pill" type="submit" disabled={submitting}>
                {submitting ? "Connecting to Stripe…" : "Continue to secure payment"}
              </button>
            </div>
            <p className="checkout-assurance">
              Your card details are entered on Stripe. We never store card numbers.
            </p>
          </form>

          <aside className="summary checkout-summary" aria-label="Order summary">
            <h2>Your order</h2>
            <div className="checkout-items">
              {cart.map(({ product, quantity }) => (
                <div className="checkout-item" key={product.id}>
                  <span>{quantity} × {product.name}</span>
                  <span>${(product.price * quantity).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
            <div className="summary-line"><span>Subtotal</span><span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
            <div className="summary-line"><span>Delivery</span><span>Free</span></div>
            <div className="summary-line summary-total"><span>Total</span><span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
          </aside>
        </div>
      )}
    </main>
  );
}
