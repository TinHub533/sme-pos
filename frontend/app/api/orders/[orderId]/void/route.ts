import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderResponse } from "@/lib/types";

export async function POST(_req: Request, { params }: { params: { orderId: string } }) {
  try {
    const order = await apiFetch<OrderResponse>(`/orders/${params.orderId}/void`, { method: "POST" });
    return NextResponse.json(order);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not void order";
    return NextResponse.json({ message }, { status });
  }
}
