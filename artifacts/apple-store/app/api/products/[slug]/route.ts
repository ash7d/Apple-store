import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { requireMerchant } from "@/lib/merchant";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    await connectToDatabase();
    const product = await Product.findOne({ slug }).exec();
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const record = product.toObject({ flattenMaps: true });
    return NextResponse.json({
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
    });
  } catch {
    return NextResponse.json(
      { error: "Product details are temporarily unavailable." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter valid product details." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const name = typeof values.name === "string" ? values.name.trim() : "";
  const description = typeof values.description === "string" ? values.description.trim() : "";
  const category = typeof values.category === "string" ? values.category.trim() : "";
  const brand = typeof values.brand === "string" ? values.brand.trim() : "Apple";
  const image = typeof values.image === "string" ? values.image.trim() : "";
  const price = typeof values.price === "number" ? values.price : Number.NaN;
  const stock = typeof values.stock === "number" ? values.stock : Number.NaN;
  const featured = values.featured;
  const specifications = values.specifications;
  const validImage = image.startsWith("/")
    ? !image.startsWith("//")
    : (() => {
        try {
          const url = new URL(image);
          return url.protocol === "https:" && !url.username && !url.password;
        } catch {
          return false;
        }
      })();
  if (
    !name || name.length > 160 ||
    !description || description.length > 4000 ||
    !category || category.length > 80 ||
    !brand || brand.length > 100 ||
    !Number.isFinite(price) || price < 0 || price > 10_000_000 ||
    !Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000 ||
    typeof featured !== "boolean" ||
    !image || image.length > 2048 || /[\\\u0000-\u001f]/.test(image) || !validImage ||
    !specifications || typeof specifications !== "object" || Array.isArray(specifications)
  ) {
    return NextResponse.json({ error: "Check the product details and try again." }, { status: 400 });
  }
  const entries = Object.entries(specifications as Record<string, unknown>);
  const cleanSpecifications: Record<string, string> = {};
  if (entries.length > 40) {
    return NextResponse.json({ error: "A product can have at most 40 specifications." }, { status: 400 });
  }
  for (const [key, value] of entries) {
    const cleanKey = key.trim();
    const cleanValue = typeof value === "string" ? value.trim() : "";
    if (!cleanKey || cleanKey.length > 80 || !cleanValue || cleanValue.length > 240) {
      return NextResponse.json({ error: "Each specification needs a name and a value." }, { status: 400 });
    }
    cleanSpecifications[cleanKey] = cleanValue;
  }
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "product";

  try {
    const { slug: oldSlug } = await params;
    await connectToDatabase();
    const existing = await Product.findOne({ slug: oldSlug }).exec();
    if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const collision = await Product.findOne({ slug, _id: { $ne: existing._id } }).select("_id").lean();
    if (collision) {
      return NextResponse.json(
        { error: "Another product already uses this name. Choose a different name." },
        { status: 409 },
      );
    }
    existing.set({
      name,
      slug,
      description,
      price,
      image,
      category,
      brand,
      specifications: cleanSpecifications,
      stock,
      featured,
    });
    await existing.save();
    const record = existing.toObject({ flattenMaps: true });
    return NextResponse.json({
      product: {
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
      },
    });
  } catch {
    return NextResponse.json(
      { error: "We couldn't update this product. Please try again." },
      { status: 500 },
    );
  }
}
