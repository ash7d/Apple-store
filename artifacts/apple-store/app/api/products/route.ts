import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { requireMerchant } from "@/lib/merchant";
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

function toSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "product";
}

function validateProduct(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Enter valid product details." } as const;
  }
  const values = input as Record<string, unknown>;
  const name = typeof values.name === "string" ? values.name.trim() : "";
  const description = typeof values.description === "string" ? values.description.trim() : "";
  const category = typeof values.category === "string" ? values.category.trim() : "";
  const brand = typeof values.brand === "string" ? values.brand.trim() : "Apple";
  const image = typeof values.image === "string" ? values.image.trim() : "";
  const price = typeof values.price === "number" ? values.price : Number.NaN;
  const stock = typeof values.stock === "number" ? values.stock : Number.NaN;
  const featured = values.featured;

  if (!name || name.length > 160) return { error: "Product name must be 1–160 characters." } as const;
  if (!description || description.length > 4000) return { error: "Description must be 1–4,000 characters." } as const;
  if (!category || category.length > 80) return { error: "Category must be 1–80 characters." } as const;
  if (!brand || brand.length > 100) return { error: "Brand must be 1–100 characters." } as const;
  if (!Number.isFinite(price) || price < 0 || price > 10_000_000) return { error: "Enter a valid non-negative price." } as const;
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000) return { error: "Stock must be a whole number from 0 to 1,000,000." } as const;
  if (typeof featured !== "boolean") return { error: "Choose whether this product is featured." } as const;
  if (!image || image.length > 2048 || /[\\\u0000-\u001f]/.test(image)) return { error: "Enter a valid product image URL or site path." } as const;
  if (image.startsWith("/")) {
    if (image.startsWith("//")) return { error: "Enter a valid product image URL or site path." } as const;
  } else {
    try {
      const parsed = new URL(image);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
        return { error: "Product image links must use HTTPS." } as const;
      }
    } catch {
      return { error: "Enter a valid product image URL or site path." } as const;
    }
  }

  const rawSpecifications = values.specifications;
  if (
    !rawSpecifications ||
    typeof rawSpecifications !== "object" ||
    Array.isArray(rawSpecifications)
  ) {
    return { error: "Enter product specifications as name-and-value pairs." } as const;
  }
  const entries = Object.entries(rawSpecifications as Record<string, unknown>);
  if (entries.length > 40) return { error: "A product can have at most 40 specifications." } as const;
  const specifications: Record<string, string> = {};
  for (const [key, rawValue] of entries) {
    const cleanKey = key.trim();
    const cleanValue = typeof rawValue === "string" ? rawValue.trim() : "";
    if (!cleanKey || cleanKey.length > 80 || !cleanValue || cleanValue.length > 240) {
      return { error: "Each specification needs a name and a value (up to 240 characters)." } as const;
    }
    specifications[cleanKey] = cleanValue;
  }

  return {
    value: {
      name,
      slug: toSlug(name),
      description,
      price,
      image,
      category,
      brand,
      specifications,
      stock,
      featured,
    },
  } as const;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const manage = url.searchParams.get("manage") === "true";
    if (manage) {
      const access = await requireMerchant();
      if (access.status !== 200) {
        return NextResponse.json(
          { error: access.status === 401 ? "Please sign in to manage products." : "Merchant access is required." },
          { status: access.status },
        );
      }
    }
    await connectToDatabase();
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

    const query = Product.find(filter).sort(sort);
    if (!manage) query.limit(60);
    const products = await query.exec();
    return NextResponse.json(products.map(serializeProduct));
  } catch {
    return NextResponse.json(
      { error: "Products are temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireMerchant();
    if (access.status !== 200) {
      return NextResponse.json(
        { error: access.status === 401 ? "Please sign in to manage products." : "Merchant access is required." },
        { status: access.status },
      );
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Enter valid product details." }, { status: 400 });
    }
    const parsed = validateProduct(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    await connectToDatabase();
    const slugBase = parsed.value.slug;
    let slug = slugBase;
    let suffix = 2;
    while (await Product.exists({ slug })) slug = `${slugBase}-${suffix++}`;
    const product = await Product.create({ ...parsed.value, slug });
    return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
  } catch (error) {
    // A duplicate slug is possible if two merchant requests create the same
    // name at once; the unique MongoDB index remains the final safeguard.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "A product with that name already exists. Try a slightly different name." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "We couldn't save this product. Please try again." },
      { status: 500 },
    );
  }
}
