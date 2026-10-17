import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="page-wrap checkout-result">
      <span className="eyebrow">No payment taken</span>
      <h1>Still deciding?</h1>
      <p>Your checkout wasn’t completed. Return to your bag to try again; reserved items are released when the payment session expires.</p>
      <div className="checkout-result-actions">
        <Link className="pill" href="/cart">Return to your bag</Link>
        <Link className="text-link" href="/products">Keep browsing</Link>
      </div>
    </main>
  );
}
