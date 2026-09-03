import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

// Admin-only on the backend (AdminUsersController) — resets another admin.
export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const body = await req.json();
  try {
    await apiFetch<void>(`/admin/users/${params.userId}/reset-password`, {
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
