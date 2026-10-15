import type { Order, Product, User } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || "Something went wrong. Please try again.");
  return payload as T;
}

export const getProducts = (params: { q?: string; category?: string; sort?: string } = {}) => {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.sort) search.set("sort", params.sort);
  const query = search.toString();
  return request<Product[]>(`/api/products${query ? `?${query}` : ""}`);
};

export const getProduct = (slug: string) => request<Product>(`/api/products/${encodeURIComponent(slug)}`);
export const getMe = () => request<{ user: User | null }>("/api/auth/me");
export const login = (email: string, password: string) =>
  request<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
export const signup = (name: string, email: string, password: string) =>
  request<{ user: User }>("/api/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) });
export const logout = () => request<{ ok: true }>("/api/auth/logout", { method: "POST" });
export const getOrders = () => request<Order[]>("/api/orders");
