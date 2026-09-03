import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { MfaEnrollResponse } from "@/lib/types";

export async function POST() {
  try {
    const enrollment = await apiFetch<MfaEnrollResponse>("/auth/mfa/enroll", { method: "POST" });
    return NextResponse.json(enrollment);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not start MFA enrollment";
    return NextResponse.json({ message }, { status });
  }
}
