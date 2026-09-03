import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { productId: string } }) {
  const body = await req.json();
  try {
    await apiFetch(`/inventory/${params.productId}/restock`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not restock product";
    return NextResponse.json({ message }, { status });
  }
}
