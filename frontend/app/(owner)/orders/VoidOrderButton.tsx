"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { apiRequest } from "@/lib/clientFetch";

export default function VoidOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVoid() {
    if (!confirm("Void this order? This restocks all its items.")) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/orders/${orderId}/void`, { method: "POST" }, "Could not void order");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not void order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="danger" size="sm" onClick={handleVoid} disabled={loading}>
        {loading ? "…" : "Void"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
