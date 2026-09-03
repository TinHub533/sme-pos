"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { apiRequest } from "@/lib/clientFetch";

export default function ShopActions({ shopId, active }: { shopId: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      const action = active ? "suspend" : "reactivate";
      await apiRequest(`/api/admin/shops/${shopId}/${action}`, { method: "POST" }, `Could not ${action} shop`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" variant={active ? "danger" : "success"} size="sm" onClick={toggle} disabled={loading}>
        {loading ? "…" : active ? "Suspend" : "Reactivate"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
