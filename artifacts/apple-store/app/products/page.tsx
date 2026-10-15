"use client";

import { useEffect, useMemo, useState } from "react";
import { getProducts } from "../../lib/api";
import type { Product } from "../../lib/types";
import { ProductCard, ProductSkeletons } from "../../components/product-card";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const categories = useMemo(() => Array.from(new Set(products.map(product => product.category).filter(Boolean))), [products]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timeout = window.setTimeout(() => {
      getProducts({ q: query.trim() || undefined, category: category || undefined, sort: sort || undefined })
        .then(data => { if (active) { setProducts(data); setError(""); } })
        .catch(e => { if (active) setError(e.message); })
        .finally(() => { if (active) setLoading(false); });
    }, query ? 220 : 0);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [query, category, sort, attempt]);
  return (
    <main className="page-wrap">
      <header className="page-title"><span className="eyebrow">The collection</span><h1>Find your fit.</h1><p>Explore the details, then choose what feels right.</p></header>
      <div className="catalog-toolbar">
        <label className="sr-only" htmlFor="catalog-search">Search products</label>
        <input id="catalog-search" className="search-input" type="search" placeholder="Search the collection" value={query} onChange={event => setQuery(event.target.value)} />
        <div className="toolbar-controls">
          <label className="sr-only" htmlFor="category-filter">Filter by category</label>
          <select id="category-filter" className="select-input" value={category} onChange={event => setCategory(event.target.value)}>
            <option value="">All categories</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}
            {!categories.length && <><option value="iPhone">iPhone</option><option value="Mac">Mac</option><option value="Watch">Watch</option></>}
          </select>
          <label className="sr-only" htmlFor="sort-products">Sort products</label>
          <select id="sort-products" className="select-input" value={sort} onChange={event => setSort(event.target.value)}>
            <option value="">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option>
          </select>
        </div>
      </div>
      <p className="catalog-count" aria-live="polite">{loading ? "Finding your options…" : `${products.length} ${products.length === 1 ? "product" : "products"}`}</p>
      <section className="catalog-grid">
        {loading ? <ProductSkeletons /> : error ? <div className="notice error" role="alert">{error} <button className="remove-button" onClick={() => { setError(""); setLoading(true); setAttempt(value => value + 1); }}>Try again</button></div> : products.length ? <div className="product-grid">{products.map(product => <ProductCard key={product.id} product={product} />)}</div> : (
          <div className="empty-state"><h2>Nothing in this view.</h2><p>Try another search or clear your filters to see the full collection.</p><button className="pill" onClick={() => { setQuery(""); setCategory(""); setSort(""); }}>Clear filters</button></div>
        )}
      </section>
    </main>
  );
}
