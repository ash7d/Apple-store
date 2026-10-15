export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image: string;
  category: string;
  brand: string;
  specifications: Record<string, string>;
  stock: number;
  featured: boolean;
};

export type User = { id: string; name: string; email: string };
export type Order = {
  id: string;
  items: { productId: string; name: string; image: string; quantity: number; price: number }[];
  total: number;
  status: string;
  createdAt: string;
};

export type CartItem = { product: Product; quantity: number };
