import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { decodeSession } from "@/lib/jwt";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const backendRes = await fetch(`${BACKEND_URL}/onboarding/shop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!backendRes.ok) {
    const errBody = await backendRes.json().catch(() => null);
    return NextResponse.json(
      { message: errBody?.message ?? "Could not create shop" },
      { status: backendRes.status }
    );
  }

  // Onboarding logs the new owner straight in — same cookie-setting
  // logic as /api/auth/login, duplicated here rather than shared since
  // the two response shapes differ slightly (OnboardingResponse wraps
  // the token alongside the new shop, LoginResponse doesn't).
  const { token, shop } = await backendRes.json();
  const session = decodeSession(token);

  const res = NextResponse.json({ role: session?.role ?? null, shop });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session ? session.exp - Math.floor(Date.now() / 1000) : 60 * 60,
  });
  return res;
}
