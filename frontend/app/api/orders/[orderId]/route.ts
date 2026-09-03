import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderResponse } from "@/lib/types";

// Polled by the POS screen while a KHQR payment is pending — the order
// flips OPEN -> PAID once the bank webhook lands (see
// PaymentWebhookController), no dedicated "check payment" endpoint needed.
export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  try {
    const order = await apiFetch<OrderResponse>(`/orders/${params.orderId}`);
    return NextResponse.json(order);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not load order";
    return NextResponse.json({ message }, { status });
  }
}
