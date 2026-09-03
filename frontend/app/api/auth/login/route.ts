import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { decodeSession } from "@/lib/jwt";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!backendRes.ok) {
    const errBody = await backendRes.json().catch(() => null);
    return NextResponse.json(
      { message: errBody?.message ?? "Login failed" },
      { status: backendRes.status }
    );
  }

  const { token } = await backendRes.json();
  const session = decodeSession(token);

  const res = NextResponse.json({ role: session?.role ?? null });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Mirrors the backend's own expiration rather than inventing a
    // separate frontend session lifetime — one source of truth for "how
    // long is this login good for."
    maxAge: session ? session.exp - Math.floor(Date.now() / 1000) : 60 * 60,
  });
  return res;
}
