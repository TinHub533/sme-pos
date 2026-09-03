import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import type { DailyClosingResponse } from "@/lib/types";

export async function POST(req: Request, { params }: { params: { date: string } }) {
  const body = await req.json();
  try {
    const closing = await apiFetch<DailyClosingResponse>(`/daily-closings/${params.date}/reconcile`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(closing);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof ApiError ? err.message : "Could not reconcile";
    return NextResponse.json({ message }, { status });
  }
}
