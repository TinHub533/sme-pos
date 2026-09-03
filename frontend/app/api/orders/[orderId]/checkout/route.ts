import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderResponse, KhqrCheckoutResponse } from "@/lib/types";

export async function POST(req: Request, { params }: { params: { orderId: string } }) {
  const body = await req.json();
  try {
    // CASH resolves immediately with the paid OrderResponse; KHQR resolves
    // with a quote (KhqrCheckoutResponse) while the order itself stays OPEN
    // until the bank webhook confirms it — same request shape, different
    // response shape, so just pass whichever comes back through untyped.
    const result = await apiFetch<OrderResponse | KhqrCheckoutResponse>(`/orders/${params.orderId}/checkout`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Checkout failed";
    return NextResponse.json({ message }, { status });
  }
}
