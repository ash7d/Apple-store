import { Types } from "mongoose";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function requireMerchant(): Promise<{ status: 200 } | { status: 401 | 403 }> {
  const session = await getSessionUser();
  if (!session || !Types.ObjectId.isValid(session.id)) return { status: 401 };

  await connectToDatabase();
  const user = await User.findById(session.id).select("role").lean();
  if (!user) return { status: 401 };
  if (user.role !== "merchant") return { status: 403 };
  return { status: 200 };
}
