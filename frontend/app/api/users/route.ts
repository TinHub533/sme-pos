import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { StaffResponse } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const staff = await apiFetch<StaffResponse>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(staff);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not create staff account";
    return NextResponse.json({ message }, { status });
  }
}
