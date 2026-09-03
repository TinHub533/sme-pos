import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

// Owner-only on the backend (StaffController) — resets a Cashier in the
// caller's own shop.
export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const body = await req.json();
  try {
    await apiFetch<void>(`/users/${params.userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not reset password";
    return NextResponse.json({ message }, { status });
  }
}
