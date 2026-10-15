import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Order from "@/models/Order";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to view your orders." }, { status: 401 });
  }
  if (!Types.ObjectId.isValid(user.id)) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const orders = await Order.find({ user: new Types.ObjectId(user.id) })
      .sort({ createdAt: -1 })
      .exec();
    return NextResponse.json(
      orders.map((order) => ({
        id: order._id.toString(),
        items: order.items.map((item) => ({
          productId: item.product.toString(),
          name: item.name,
          image: item.image,
          quantity: item.quantity,
          price: item.price,
        })),
        total: order.total,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      })),
    );
  } catch {
    return NextResponse.json(
      { error: "Your orders are temporarily unavailable." },
      { status: 500 },
    );
  }
}
