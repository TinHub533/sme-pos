import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

// A wrong code legitimately 401s here — same reasoning as
// /api/auth/change-password. The client side calls this with a raw fetch,
// not apiRequest, to avoid a wrong-code typo triggering a false
// "session expired" redirect.
export async function POST(req: Request) {
  const body = await req.json();
  try {
    await apiFetch<void>("/auth/mfa/confirm", { method: "POST", body: JSON.stringify(body) });
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not confirm MFA code";
    return NextResponse.json({ message }, { status });
  }
}
