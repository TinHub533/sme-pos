"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DailyClosingResponse } from "@/lib/types";
import { formatUsd } from "@/lib/money";
import { Button, Card, ErrorAlert, Field, Input } from "@/components/ui";
import { apiRequest } from "@/lib/clientFetch";

export default function ReconcileForm({ date, closing }: { date: string; closing: DailyClosingResponse }) {
  const router = useRouter();
  const [cashCounted, setCashCounted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest(
        `/api/daily-closings/${date}/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cashCounted: Number(cashCounted) }),
        },
        "Could not reconcile",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reconcile");
    } finally {
      setLoading(false);
    }
  }

  const varianceTone =
    closing.variance == null ? "text-gray-900" : closing.variance === 0 ? "text-emerald-600" : "text-red-600";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">Total sales</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{formatUsd(closing.totalSales)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">Cash counted</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{formatUsd(closing.cashCounted)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">Variance</p>
          <p className={`mt-1 text-2xl font-semibold ${varianceTone}`}>{formatUsd(closing.variance)}</p>
        </Card>
      </div>

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="font-semibold text-gray-900">
            {closing.cashCounted != null ? "Re-count drawer" : "Count drawer"}
          </h2>

          <ErrorAlert>{error}</ErrorAlert>

          <div className="max-w-xs">
            <Field label="Cash counted (USD)" htmlFor="cashCounted">
              <Input
                id="cashCounted"
                type="number"
                step="0.01"
                min="0"
                value={cashCounted}
                onChange={(e) => setCashCounted(e.target.value)}
                required
                autoFocus
              />
            </Field>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Reconcile"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
