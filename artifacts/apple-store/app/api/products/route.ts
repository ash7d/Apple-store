import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeProduct(product: Awaited<ReturnType<typeof Product.findOne>>) {
  if (!product) return null;
  const record = product.toObject({ flattenMaps: true });
  return {
    id: record._id.toString(),
    name: record.name,
    slug: record.slug,
    description: record.description,
    price: record.price,
    image: record.image,
    category: record.category,
    brand: record.brand,
    specifications: record.specifications ?? {},
    stock: record.stock,
    featured: record.featured,
  };
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const search = url.searchParams.get("q")?.trim().slice(0, 80);
    const category = url.searchParams.get("category")?.trim().slice(0, 80);
    const sortKey = url.searchParams.get("sort");
    const filter: Record<string, unknown> = {};

    if (search) {
      const safeSearch = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { name: safeSearch },
        { description: safeSearch },
        { category: safeSearch },
      ];
    }
    if (category) filter.category = category;

    const sort: Record<string, 1 | -1> =
      sortKey === "price-asc"
        ? { price: 1 as const }
        : sortKey === "price-desc"
          ? { price: -1 as const }
          : sortKey === "name"
            ? { name: 1 as const }
            : { createdAt: -1 as const };

    const products = await Product.find(filter).sort(sort).limit(60).exec();
    return NextResponse.json(products.map(serializeProduct));
  } catch {
    return NextResponse.json(
      { error: "Products are temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
