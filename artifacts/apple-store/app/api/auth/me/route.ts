import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { Types } from "mongoose";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !Types.ObjectId.isValid(user.id)) {
    return NextResponse.json({ user: null });
  }

  try {
    await connectToDatabase();
    const currentUser = await User.findById(user.id).select("_id name email role").lean();
    if (!currentUser) return NextResponse.json({ user: null });
    return NextResponse.json({
      user: {
        id: currentUser._id.toString(),
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role === "merchant" ? "merchant" : "customer",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Your account is temporarily unavailable." },
      { status: 500 },
    );
  }
}
