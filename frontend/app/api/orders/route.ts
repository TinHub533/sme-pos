import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderResponse } from "@/lib/types";

export async function POST() {
  try {
    const order = await apiFetch<OrderResponse>("/orders", { method: "POST" });
    return NextResponse.json(order);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not start a new sale";
    return NextResponse.json({ message }, { status });
  }
}
