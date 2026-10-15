import { connectToDatabase } from "../src/lib/db";
import Product from "../src/models/Product";

const products = [
  {
    name: "iPhone 18 Pro",
    slug: "iphone-18-pro",
    description:
      "A remarkable camera system, a stunning display, and all-day performance in a beautifully considered design.",
    price: 999,
    image: "/products/iphone.jpg",
    category: "iPhone",
    brand: "Apple",
    specifications: {
      Display: "6.3-inch Super Retina XDR",
      Chip: "A-series Pro chip",
      Camera: "Pro camera system",
      Storage: "256GB",
    },
    stock: 18,
    featured: true,
  },
  {
    name: "MacBook Pro 14-inch",
    slug: "macbook-pro-14",
    description:
      "Serious power for demanding work, with a brilliant display and battery life that keeps going.",
    price: 1599,
    image: "/products/macbook.jpg",
    category: "Mac",
    brand: "Apple",
    specifications: {
      Display: "14.2-inch Liquid Retina XDR",
      Chip: "Apple silicon",
      Memory: "18GB unified memory",
      Storage: "512GB SSD",
    },
    stock: 12,
    featured: true,
  },
  {
    name: "Apple Watch Series 12",
    slug: "apple-watch-series-12",
    description:
      "A powerful health and fitness companion that makes more of every day.",
    price: 399,
    image: "/products/watch.jpg",
    category: "Apple Watch",
    brand: "Apple",
    specifications: {
      Display: "Always-On Retina display",
      Case: "Aluminum",
      Connectivity: "GPS",
      WaterResistance: "50 metres",
    },
    stock: 24,
    featured: true,
  },
];

async function seed() {
  await connectToDatabase();
  for (const product of products) {
    await Product.updateOne(
      { slug: product.slug },
      { $setOnInsert: product },
      { upsert: true },
    );
  }
  process.stdout.write(`Seeded ${products.length} Apple Store products.\n`);
  await Product.db?.close();
}

seed().catch((error: unknown) => {
  process.stderr.write(
    `Product seeding failed: ${
      error instanceof Error ? error.message : "unknown error"
    }\n`,
  );
  process.exitCode = 1;
});
