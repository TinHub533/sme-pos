import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { ShopResponse } from "@/lib/types";

export async function POST(_req: Request, { params }: { params: { shopId: string } }) {
  try {
    const shop = await apiFetch<ShopResponse>(`/admin/shops/${params.shopId}/suspend`, { method: "POST" });
    return NextResponse.json(shop);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not suspend shop";
    return NextResponse.json({ message }, { status });
  }
}
