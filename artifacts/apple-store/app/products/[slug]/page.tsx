"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getProduct } from "../../../lib/api";
import type { Product } from "../../../lib/types";
import { productImage } from "../../../components/product-card";
import { useStore } from "../../../components/store-provider";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const { addToCart } = useStore();
  useEffect(() => {
    let active = true;
    getProduct(slug).then(value => { if (active) setProduct(value); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);
  if (loading) return <main className="page-wrap"><div className="detail-layout"><div className="skeleton detail-image" /><div className="skeleton" /></div></main>;
  if (error || !product) return <main className="page-wrap"><div className="page-title"><div className="notice error" role="alert">{error || "We couldn’t find that product."}</div><p><Link className="pill pill-secondary" href="/products">Back to all products</Link></p></div></main>;
  return (
    <main className="page-wrap">
      <div className="detail-layout">
        <div className="detail-image"><img src={productImage(product)} alt={product.name} /></div>
        <section className="detail-copy">
          <span className="eyebrow">{product.brand} · {product.category}</span>
          <h1>{product.name}</h1>
          <p className="description">{product.description}</p>
          <p className="detail-price">${product.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          <button className="pill" disabled={product.stock < 1} onClick={() => { addToCart(product); setAdded(true); }}>{product.stock < 1 ? "Unavailable" : "Add to bag"}</button>
          <p className="stock-note" role="status">{added ? "Added to your bag." : product.stock > 0 ? "Available now · Free delivery" : "Currently unavailable"}</p>
          <div className="spec-list"><span className="eyebrow">The details</span>
            {Object.entries(product.specifications || {}).map(([key, value]) => <div className="spec-row" key={key}><span>{key}</span><span>{value}</span></div>)}
            <div className="spec-row"><span>Availability</span><span>{product.stock > 0 ? `${product.stock} in stock` : "Unavailable"}</span></div>
          </div>
        </section>
      </div>
    </main>
  );
}
