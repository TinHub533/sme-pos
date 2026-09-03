import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { MfaStatusResponse } from "@/lib/types";

export async function GET() {
  try {
    const status = await apiFetch<MfaStatusResponse>("/auth/mfa/status");
    return NextResponse.json(status);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not load MFA status";
    return NextResponse.json({ message }, { status });
  }
}
