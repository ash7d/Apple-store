"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOrders } from "../../lib/api";
import type { Order } from "../../lib/types";
import { useStore } from "../../components/store-provider";

export default function OrdersPage() {
  const { user, authLoading } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    getOrders().then(data => { if (active) { setOrders(data); setError(""); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, authLoading, attempt]);
  return <main className="page-wrap">
    <header className="page-title"><span className="eyebrow">Your account</span><h1>Your orders.</h1><p>A clear view of what you’ve chosen.</p></header>
    {authLoading || loading ? <div className="skeleton" aria-label="Loading orders" /> : !user ? <div className="empty-state"><h2>Sign in to see your orders.</h2><p>Your order history lives with your account.</p><Link className="pill" href="/login">Sign in</Link></div> : error ? <div className="empty-state"><div className="notice error" role="alert">{error}</div><button className="pill" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : orders.length ? <section className="orders-list" aria-label="Order history">
      {orders.map(order => <article className="order-card" key={order.id}>
        <div><h2>Order {order.id}</h2><p>{new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}<br />{order.items.map(item => `${item.quantity} × ${item.name}`).join(" · ")}</p></div>
        <div><span className="order-status">{order.status}</span><p style={{ marginTop: 12, textAlign: "right" }}>${order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p></div>
      </article>)}
    </section> : <div className="empty-state"><h2>A fresh start.</h2><p>Your order history will appear here when you have one.</p><Link className="pill" href="/products">Explore products</Link></div>}
  </main>;
}
