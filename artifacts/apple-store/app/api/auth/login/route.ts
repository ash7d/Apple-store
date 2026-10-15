import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid sign-in details." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Enter valid sign-in details." }, { status: 400 });
  }
  const { email, password } = body as Record<string, unknown>;
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!cleanEmail || typeof password !== "string" || !password) {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const user = await User.findOne({ email: cleanEmail })
      .select("+passwordHash")
      .exec();
    const validPassword =
      user && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !validPassword) {
      return NextResponse.json(
        { error: "Your email or password doesn't match." },
        { status: 401 },
      );
    }

    const publicUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
    const token = await createSessionToken(publicUser);
    const response = NextResponse.json({ user: publicUser });
    response.cookies.set("apple_store_session", token, sessionCookieOptions);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
