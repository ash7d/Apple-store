"use client";

import Link from "next/link";
import { useStore } from "../../components/store-provider";
import { productImage } from "../../components/product-card";

export default function CartPage() {
  const { cart, setQuantity, removeFromCart } = useStore();
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return (
    <main className="page-wrap">
      <header className="page-title"><span className="eyebrow">Your selection</span><h1>Your bag.</h1><p>A good choice, one detail at a time.</p></header>
      {!cart.length ? <div className="empty-state"><h2>Your bag is taking a breather.</h2><p>When you find the right thing, it will be waiting here.</p><Link className="pill" href="/products">Explore products</Link></div> : (
        <div className="cart-layout">
          <section aria-label="Items in your bag">
            {cart.map(({ product, quantity }) => <article className="cart-row" key={product.id}>
              <img src={productImage(product)} alt={product.name} />
              <div><h2>{product.name}</h2><p>${product.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
                  <button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => quantity === 1 ? removeFromCart(product.id) : setQuantity(product.id, quantity - 1)}>−</button>
                  <span aria-live="polite">{quantity}</span>
                  <button type="button" aria-label={`Increase ${product.name} quantity`} onClick={() => setQuantity(product.id, quantity + 1)} disabled={quantity >= product.stock}>+</button>
                </div>
                <button className="remove-button" type="button" onClick={() => removeFromCart(product.id)}>Remove</button>
              </div>
              <strong>${(product.price * quantity).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
            </article>)}
          </section>
          <aside className="summary">
            <h2>Summary</h2><div className="summary-line"><span>Subtotal</span><span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
            <div className="summary-line"><span>Delivery</span><span>Free</span></div>
            <div className="summary-line summary-total"><span>Total</span><span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
            <button className="pill" type="button" disabled aria-describedby="checkout-note">Continue to checkout</button>
            <small id="checkout-note">Checkout will be available soon. Your bag is saved on this device.</small>
          </aside>
        </div>
      )}
    </main>
  );
}
