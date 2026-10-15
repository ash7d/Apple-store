import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import User from "@/models/User";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid form details." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Enter valid form details." }, { status: 400 });
  }

  const { name, email, password } = body as Record<string, unknown>;
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (cleanName.length < 2 || cleanName.length > 100) {
    return NextResponse.json(
      { error: "Enter a name between 2 and 100 characters." },
      { status: 400 },
    );
  }
  if (!isEmail(cleanEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Your password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const existing = await User.findOne({ email: cleanEmail }).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash: await bcrypt.hash(password, 12),
    });
    const publicUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
    const token = await createSessionToken(publicUser);
    const response = NextResponse.json({ user: publicUser }, { status: 201 });
    response.cookies.set("apple_store_session", token, sessionCookieOptions);
    return response;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "We couldn't create your account. Please try again." },
      { status: 500 },
    );
  }
}
