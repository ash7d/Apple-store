"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { getMe, getProducts } from "../../../lib/api";
import type { Product } from "../../../lib/types";
import styles from "./products.module.css";

type AccessState = "loading" | "merchant" | "denied" | "error";

type ProductForm = {
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  brand: string;
  specifications: string;
  stock: string;
  featured: boolean;
};

const blankForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  image: "",
  category: "",
  brand: "",
  specifications: "{}",
  stock: "0",
  featured: false,
};

function formFromProduct(product: Product): ProductForm {
  return {
    name: product.name,
    description: product.description,
    price: String(product.price),
    image: product.image,
    category: product.category,
    brand: product.brand,
    specifications: JSON.stringify(product.specifications ?? {}, null, 2),
    stock: String(product.stock),
    featured: product.featured,
  };
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

export default function MerchantProductsPage() {
  const [access, setAccess] = useState<AccessState>("loading");
  const [accessError, setAccessError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(blankForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const loadProducts = useCallback(async (refresh = false) => {
    setProductsError("");
    if (refresh) setRefreshing(true);
    else setLoadingProducts(true);
    try {
      setProducts(await getProducts({ manage: true }));
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "Products could not be loaded.");
    } finally {
      setLoadingProducts(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getMe()
      .then(({ user }) => {
        if (!active) return;
        setAccess((user as ({ role?: string } | null))?.role === "merchant" ? "merchant" : "denied");
      })
      .catch(error => {
        if (!active) return;
        setAccessError(error instanceof Error ? error.message : "Your account could not be checked.");
        setAccess("error");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (access === "merchant") void loadProducts();
  }, [access, loadProducts]);

  function startAdd() {
    setEditorOpen(true);
    setEditing(null);
    setForm(blankForm);
    setFormError("");
    setSuccess("");
  }

  function startEdit(product: Product) {
    setEditorOpen(true);
    setEditing(product);
    setForm(formFromProduct(product));
    setFormError("");
    setSuccess("");
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    setFormError("");
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess("");
    let specifications: Record<string, string>;
    try {
      const parsed: unknown = JSON.parse(form.specifications || "{}");
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object" ||
          Object.values(parsed).some(value => typeof value !== "string")) {
        throw new Error("Specifications must be an object with text values.");
      }
      specifications = parsed as Record<string, string>;
    } catch (error) {
      setFormError(error instanceof Error && error.message !== "Unexpected end of JSON input"
        ? error.message
        : "Enter specifications as valid JSON, with text values.");
      return;
    }
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setFormError("Enter a valid price and a whole-number stock quantity.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      image: form.image.trim(),
      category: form.category.trim(),
      brand: form.brand.trim(),
      specifications,
      stock,
      featured: form.featured,
    };
    setSaving(true);
    try {
      const endpoint = editing
        ? `/api/products/${encodeURIComponent(editing.slug)}`
        : "/api/products";
      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "The product could not be saved.");
      const savedProduct = (result as { product?: Product }).product;
      if (!savedProduct) throw new Error("The save completed, but the returned product was unavailable.");
      setProducts(current => {
        const exists = current.some(product => product.id === savedProduct.id);
        return exists
          ? current.map(product => product.id === savedProduct.id ? savedProduct : product)
          : [savedProduct, ...current];
      });
      setSuccess(`${savedProduct.name} ${editing ? "updated" : "added"} successfully.`);
      setEditorOpen(false);
      setEditing(null);
      setForm(blankForm);
      await loadProducts(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (access === "loading") {
    return <main className={`page-wrap ${styles.page}`}><div className={styles.loadingPanel} aria-label="Checking account access"><span /><span /><span /></div></main>;
  }

  if (access === "error") {
    return (
      <main className={`page-wrap ${styles.page}`}>
        <section className={styles.accessState} role="alert">
          <span className="eyebrow">Merchant access</span>
          <h1>We couldn’t check your account.</h1>
          <p>{accessError}</p>
          <button className="pill" type="button" onClick={() => window.location.reload()}>Try again</button>
        </section>
      </main>
    );
  }

  if (access === "denied") {
    return (
      <main className={`page-wrap ${styles.page}`}>
        <section className={styles.accessState}>
          <span className="eyebrow">Merchant access</span>
          <h1>This space is for shop owners.</h1>
          <p>Sign in with a merchant account to manage the product collection.</p>
          <Link className="pill" href="/login">Sign in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={`page-wrap ${styles.page}`}>
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">Merchant · Product catalogue</span>
          <h1>Manage your collection.</h1>
          <p>Keep product details, availability and presentation up to date.</p>
        </div>
        <div className={styles.headingActions}>
          <button className={styles.refreshButton} type="button" onClick={() => void loadProducts(true)} disabled={refreshing || saving} aria-label="Refresh product list">
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13.2 5.6A5.5 5.5 0 1 0 13.5 8M13.2 2.8v3.4H9.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
          <button className="pill" type="button" onClick={startAdd}>Add product</button>
        </div>
      </header>

      <div className={styles.summaryLine}>
        <span>{loadingProducts ? "Loading catalogue…" : `${products.length} ${products.length === 1 ? "product" : "products"}`}</span>
        <span>Changes are saved to your store catalogue.</span>
      </div>

      {success && <div className={styles.successNotice} role="status" aria-live="polite">{success}</div>}
      {productsError && (
        <div className="notice error" role="alert">
          {productsError}
          <button className="remove-button" type="button" onClick={() => void loadProducts(true)}>Try again</button>
        </div>
      )}

      {editorOpen ? (
        <section className={styles.editor} aria-labelledby="editor-title">
          <div className={styles.editorHeading}>
            <div>
              <span className="eyebrow">{editing ? "Product details" : "New listing"}</span>
              <h2 id="editor-title">{editing ? "Edit product" : "Add a product"}</h2>
            </div>
            <button className={styles.closeButton} type="button" onClick={closeEditor} aria-label="Close product editor">Close</button>
          </div>
          <form onSubmit={submitProduct}>
            <div className={styles.formGrid}>
              <label className={styles.field}>Product name<input className="form-input" required maxLength={160} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
              <label className={styles.field}>Brand<input className="form-input" required value={form.brand} onChange={event => setForm({ ...form, brand: event.target.value })} /></label>
              <label className={styles.field}>Category<input className="form-input" required value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} placeholder="iPhone, Mac, Watch…" /></label>
              <label className={styles.field}>Price (USD)<input className="form-input" required type="number" min="0" step="0.01" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} /></label>
              <label className={styles.field}>Stock quantity<input className="form-input" required type="number" min="0" step="1" value={form.stock} onChange={event => setForm({ ...form, stock: event.target.value })} /></label>
              <label className={styles.field}>Image path or URL<input className="form-input" required value={form.image} onChange={event => setForm({ ...form, image: event.target.value })} placeholder="/products/iphone.jpg" /></label>
              <label className={`${styles.field} ${styles.wideField}`}>Description<textarea className={styles.textarea} required rows={3} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
              <label className={`${styles.field} ${styles.wideField}`}>Specifications <span className={styles.fieldHint}>JSON object with text values</span><textarea className={`${styles.textarea} ${styles.codeInput}`} rows={5} value={form.specifications} onChange={event => setForm({ ...form, specifications: event.target.value })} spellCheck={false} /></label>
            </div>
            <label className={styles.featuredToggle}>
              <input type="checkbox" checked={form.featured} onChange={event => setForm({ ...form, featured: event.target.checked })} />
              <span><strong>Feature this product</strong><small>Give it a place in the featured collection.</small></span>
            </label>
            {formError && <p className={styles.formError} role="alert">{formError}</p>}
            <div className={styles.formActions}>
              <button className={styles.cancelButton} type="button" onClick={closeEditor} disabled={saving}>Cancel</button>
              <button className="pill" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add product"}</button>
            </div>
          </form>
        </section>
      ) : null}

      {loadingProducts ? (
        <div className={styles.productList} aria-label="Loading products">
          {[1, 2, 3].map(item => <div className={styles.productSkeleton} key={item}><span /><div><i /><i /></div><i /></div>)}
        </div>
      ) : !productsError && products.length === 0 ? (
        <section className={styles.emptyState}>
          <span className={styles.emptyMark} aria-hidden="true">01</span>
          <h2>A collection starts here.</h2>
          <p>Add your first product to begin building the catalogue customers will see.</p>
          <button className="pill" type="button" onClick={startAdd}>Add your first product</button>
        </section>
      ) : (
        <section className={styles.productList} aria-label="Products">
          {products.map((product, index) => (
            <article className={styles.productRow} key={product.id}>
              <div className={styles.productIndex}>{String(index + 1).padStart(2, "0")}</div>
              <div className={styles.productThumb}>
                {product.image ? <img src={product.image} alt="" loading="lazy" /> : <span>{product.category.slice(0, 1)}</span>}
              </div>
              <div className={styles.productInfo}>
                <h2>{product.name}</h2>
                <p>{product.brand} <span aria-hidden="true">·</span> {product.category}</p>
              </div>
              <div className={styles.productMeta}>
                <strong>{formatPrice(product.price)}</strong>
                <span className={product.stock > 0 ? styles.inStock : styles.outOfStock}>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</span>
              </div>
              {product.featured && <span className={styles.featuredTag}>Featured</span>}
              <button className={styles.editButton} type="button" onClick={() => startEdit(product)} aria-label={`Edit ${product.name}`}>Edit</button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
