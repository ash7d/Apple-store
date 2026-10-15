"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, logout as logoutRequest } from "../lib/api";
import type { CartItem, Product, User } from "../lib/types";

type StoreContextValue = {
  user: User | null;
  authLoading: boolean;
  cart: CartItem[];
  cartCount: number;
  addToCart: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
};
const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("apple-store-cart");
      if (saved) setCart(JSON.parse(saved) as CartItem[]);
    } catch { localStorage.removeItem("apple-store-cart"); }
    getMe().then(({ user: current }) => setUser(current)).catch(() => setUser(null)).finally(() => setAuthLoading(false));
  }, []);
  useEffect(() => {
    if (!authLoading) localStorage.setItem("apple-store-cart", JSON.stringify(cart));
  }, [cart, authLoading]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setCart(current => {
      const existing = current.find(item => item.product.id === product.id);
      return existing
        ? current.map(item => item.product.id === product.id ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) } : item)
        : [...current, { product, quantity: Math.min(product.stock, quantity) }];
    });
  }, []);
  const setQuantity = useCallback((productId: string, quantity: number) => {
    setCart(current => current.map(item => item.product.id === productId
      ? { ...item, quantity: Math.min(item.product.stock, Math.max(1, quantity)) }
      : item));
  }, []);
  const removeFromCart = useCallback((productId: string) => setCart(current => current.filter(item => item.product.id !== productId)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const signOut = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const value = useMemo(() => ({ user, authLoading, cart, cartCount, addToCart, setQuantity, removeFromCart, clearCart, setUser, signOut }), [user, authLoading, cart, cartCount, addToCart, setQuantity, removeFromCart, clearCart, signOut]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
