import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { decodeSession } from "@/lib/jwt";
import type { BootstrapStatusResponse } from "@/lib/types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

// Both handlers are intentionally unauthenticated proxies — this is the
// public bootstrap flow (see AdminBootstrapController), gated only by the
// backend's "no ADMIN exists yet" check, not by a session.
export async function GET() {
  const backendRes = await fetch(`${BACKEND_URL}/admin/bootstrap`, { cache: "no-store" });
  const body: BootstrapStatusResponse = await backendRes.json();
  return NextResponse.json(body, { status: backendRes.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const backendRes = await fetch(`${BACKEND_URL}/admin/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!backendRes.ok) {
    const errBody = await backendRes.json().catch(() => null);
    return NextResponse.json(
      { message: errBody?.message ?? "Could not create admin account" },
      { status: backendRes.status },
    );
  }

  // Same cookie-setting duplication as /api/onboarding — logs the new
  // admin straight in.
  const { token, admin } = await backendRes.json();
  const session = decodeSession(token);

  const res = NextResponse.json({ role: session?.role ?? null, admin });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session ? session.exp - Math.floor(Date.now() / 1000) : 60 * 60,
  });
  return res;
}
