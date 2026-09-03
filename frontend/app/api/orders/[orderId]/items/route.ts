import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderResponse } from "@/lib/types";

export async function POST(req: Request, { params }: { params: { orderId: string } }) {
  const body = await req.json();
  try {
    const order = await apiFetch<OrderResponse>(`/orders/${params.orderId}/items`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(order);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not add item";
    return NextResponse.json({ message }, { status });
  }
}
