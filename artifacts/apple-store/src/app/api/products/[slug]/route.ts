import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
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
