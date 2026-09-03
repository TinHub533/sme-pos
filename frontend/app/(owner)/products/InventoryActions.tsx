"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorAlert, Field, Input } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { apiRequest } from "@/lib/clientFetch";

type Mode = "restock" | "adjust" | null;

export default function InventoryActions({ productId }: { productId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function close() {
    setMode(null);
    setQty("");
    setReason("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const path = mode === "restock" ? "restock" : "adjust";
      const body = mode === "restock" ? { qty: Number(qty), reason } : { delta: Number(qty), reason };
      await apiRequest(
        `/api/inventory/${productId}/${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        "Could not update stock",
      );
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update stock");
    } finally {
      setLoading(false);
    }
  }

  if (mode === null) {
    return (
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setMode("restock")}>
          Restock
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setMode("adjust")}>
          Adjust
        </Button>
      </div>
    );
  }

  return (
    <Modal onClose={close} className="max-w-sm" labelledBy="inventory-action-title">
      <form onSubmit={submit} className="space-y-4">
        <h2 id="inventory-action-title" className="text-lg font-semibold text-gray-900">
          {mode === "restock" ? "Restock" : "Adjust count"}
        </h2>

        <ErrorAlert>{error}</ErrorAlert>

        <Field label={mode === "restock" ? "Quantity received" : "Delta (+/-)"} htmlFor="qty">
          <Input id="qty" type="number" step="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </Field>

        <Field label="Reason" htmlFor="reason">
          <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </Field>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
