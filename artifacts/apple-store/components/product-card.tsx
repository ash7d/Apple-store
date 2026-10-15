import Link from "next/link";
import type { Product } from "../lib/types";

const fallbackImages: Record<string, string> = {
  iphone: "/products/iphone.jpg",
  macbook: "/products/macbook.jpg",
  watch: "/products/watch.jpg",
};
export function productImage(product: Pick<Product, "image" | "name" | "category">) {
  if (product.image?.startsWith("/")) return product.image;
  const key = `${product.name} ${product.category}`.toLowerCase();
  if (key.includes("watch")) return fallbackImages.watch;
  if (key.includes("mac") || key.includes("laptop")) return fallbackImages.macbook;
  return fallbackImages.iphone;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card" data-testid={`card-product-${product.id}`}>
      <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
        <div className="product-card-image"><img src={productImage(product)} alt={product.name} loading="lazy" /></div>
        <div className="product-card-body">
          <div><h3>{product.name}</h3><p>{product.brand} · {product.category}</p></div>
          <span className="product-price">${product.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
      </Link>
    </article>
  );
}

export function ProductSkeletons() {
  return <div className="product-grid" aria-label="Loading products">{[1, 2, 3].map(item => <div key={item} className="skeleton" />)}</div>;
}
