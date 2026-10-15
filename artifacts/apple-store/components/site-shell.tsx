"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "./store-provider";

export function SiteHeader() {
  const { user, cartCount, signOut } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const links = [{ href: "/", label: "Discover" }, { href: "/products", label: "Shop" }, { href: "/orders", label: "Orders" }];
  async function handleAccount() {
    if (user) {
      try {
        await signOut();
        router.push("/");
      } catch {
        // Keep the account visible if the server could not end the session.
      }
    } else router.push("/login");
  }
  return (
    <header className="site-header">
      <div className="nav-inner">
        <button className="menu-toggle" type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span aria-hidden="true">{menuOpen ? "×" : <svg width="19" height="14" viewBox="0 0 19 14" fill="none"><path d="M1 2h17M1 7h17M1 12h17" stroke="currentColor" strokeWidth="1.5" /></svg>}</span>
        </button>
        <Link className="brand-mark" href="/" aria-label="Apple Store home">Apple</Link>
        <nav className={`main-nav${menuOpen ? " open" : ""}`} aria-label="Main navigation">
          {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}
        </nav>
        <div className="nav-tools">
          <button className="nav-account" type="button" onClick={handleAccount} aria-label={user ? `Sign out ${user.name}` : "Sign in"}>{user ? user.name : "Sign in"}</button>
          <Link className="nav-icon-link" href="/cart" aria-label={`Shopping bag, ${cartCount} items`}>
            <span aria-hidden="true">Bag</span><span className="cart-count">{cartCount}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return <footer className="footer"><div className="page-wrap footer-inner"><span>Apple Store · A considered way to choose.</span><div className="footer-links"><Link href="/products">Explore products</Link><Link href="/login">Your account</Link></div></div></footer>;
}
