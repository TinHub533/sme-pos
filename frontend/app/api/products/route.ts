import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { ProductResponse } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const product = await apiFetch<ProductResponse>("/products", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(product);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not create product";
    return NextResponse.json({ message }, { status });
  }
}
