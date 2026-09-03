import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

// Same "wrong code legitimately 401s" reasoning as /api/auth/mfa/confirm —
// client side uses a raw fetch, not apiRequest.
export async function POST(req: Request) {
  const body = await req.json();
  try {
    await apiFetch<void>("/auth/mfa/disable", { method: "POST", body: JSON.stringify(body) });
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not disable MFA";
    return NextResponse.json({ message }, { status });
  }
}
