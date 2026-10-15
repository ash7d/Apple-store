"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProducts } from "../lib/api";
import type { Product } from "../lib/types";
import { ProductCard, ProductSkeletons, productImage } from "../components/product-card";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    getProducts().then(setProducts).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  const featured = products.filter(product => product.featured).slice(0, 3);
  const hero = featured[0] ?? products[0];
  return (
    <main>
      <section className="home-intro page-wrap">
        <span className="eyebrow">A little more personal</span>
        <h1>Find your next<br />favorite thing.</h1>
        <p>Thoughtful picks. The details that matter. A better way to find the device that fits your day.</p>
      </section>
      {hero ? (
        <section className="hero-stage page-wrap" aria-label={`Featured ${hero.name}`}>
          <div className="hero-copy">
            <span className="eyebrow">The latest, considered</span>
            <h2>{hero.name}</h2>
            <p>{hero.description}</p>
            <Link className="pill" href={`/products/${hero.slug}`}>Meet {hero.name}</Link>
          </div>
          <img className="hero-art" src={productImage(hero)} alt={hero.name} />
        </section>
      ) : loading ? <div className="page-wrap"><div className="skeleton hero-stage" aria-label="Loading featured product" /></div> : (
        <div className="page-wrap">{error ? <div className="notice error" role="alert">{error}</div> : null}</div>
      )}
      <section className="page-wrap">
        <div className="section-heading">
          <div><span className="eyebrow">Selected for you</span><h2>Good things, well chosen.</h2><p>Start with the essentials. Stay for the details.</p></div>
          <Link className="pill pill-secondary" href="/products">Shop everything <span aria-hidden="true">→</span></Link>
        </div>
        {loading ? <ProductSkeletons /> : error ? <div className="notice error" role="alert">We couldn’t load the collection. {error}</div> : featured.length ? (
          <div className="product-grid">{featured.map(product => <ProductCard key={product.id} product={product} />)}</div>
        ) : products.length ? <div className="product-grid">{products.slice(0, 3).map(product => <ProductCard key={product.id} product={product} />)}</div> : (
          <div className="empty-state"><h2>Your next favorite is on its way.</h2><p>There are no products to show just yet.</p></div>
        )}
        <div className="collection-band">
          <div><span className="eyebrow">Make it yours</span><h2>Small details.<br />A very personal fit.</h2><p>From a watch that keeps pace to a Mac that opens up new possibilities, find the right place to begin.</p><Link className="pill" href="/products">Explore the collection</Link></div>
          <img className="band-art" src="/products/watch.jpg" alt="Midnight watch with a refined woven band" loading="lazy" />
        </div>
        <div className="service-strip">
          <div><strong>Choose with confidence</strong><span>Compare the details that make a difference.</span></div>
          <div><strong>One place for the essentials</strong><span>Explore the Apple devices you know and love.</span></div>
          <div><strong>Here when you need us</strong><span>Your account keeps orders close at hand.</span></div>
        </div>
      </section>
    </main>
  );
}
