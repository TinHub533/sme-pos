import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { AdminUserResponse } from "@/lib/types";

// Mirrors /api/users (StaffController's client-side proxy): server-only
// apiFetch attaches the caller's Bearer token, so the backend's
// @PreAuthorize("hasRole('ADMIN')") on AdminUsersController is what
// actually enforces this — a non-admin token just gets a 403 relayed back.
export async function POST(req: Request) {
  const body = await req.json();
  try {
    const admin = await apiFetch<AdminUserResponse>("/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(admin);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not create admin account";
    return NextResponse.json({ message }, { status });
  }
}
