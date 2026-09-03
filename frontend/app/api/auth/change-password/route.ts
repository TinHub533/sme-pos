import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

// A wrong "current password" legitimately 401s here — unlike every other
// authenticated endpoint, that's NOT "your session expired". The client
// side (ChangePasswordButton) deliberately calls this with a raw fetch,
// not lib/clientFetch's apiRequest, to avoid apiRequest's blanket
// 401-means-redirect-to-login handling misfiring on a simple typo.
export async function POST(req: Request) {
  const body = await req.json();
  try {
    await apiFetch<void>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not change password";
    return NextResponse.json({ message }, { status });
  }
}
