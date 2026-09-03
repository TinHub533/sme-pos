import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

// Admin-only on the backend (AdminController) — resets a shop's Owner, the
// platform-support case (shop owner locked out, calls support).
export async function POST(req: Request, { params }: { params: { shopId: string } }) {
  const body = await req.json();
  try {
    await apiFetch<void>(`/admin/shops/${params.shopId}/reset-owner-password`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not reset owner's password";
    return NextResponse.json({ message }, { status });
  }
}
