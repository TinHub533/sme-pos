"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorAlert, Field, Input } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { apiRequest } from "@/lib/clientFetch";

const emptyForm = {
  sku: "",
  name: "",
  priceUsd: "",
  priceKhr: "",
  category: "",
  initialQty: "",
};

export default function CreateProductForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function close() {
    setOpen(false);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest(
        "/api/products",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: form.sku,
            name: form.name,
            priceUsd: form.priceUsd ? Number(form.priceUsd) : null,
            priceKhr: form.priceKhr ? Number(form.priceKhr) : null,
            category: form.category || null,
            initialQty: form.initialQty ? Number(form.initialQty) : null,
          }),
        },
        "Could not create product",
      );
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
        </svg>
        Add product
      </Button>

      {open && (
        <Modal onClose={close} className="max-w-lg" labelledBy="add-product-title">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 id="add-product-title" className="text-lg font-semibold text-gray-900">
              Add product
            </h2>

            <ErrorAlert>{error}</ErrorAlert>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="SKU" htmlFor="sku">
                <Input id="sku" value={form.sku} onChange={(e) => update("sku", e.target.value)} required />
              </Field>
              <Field label="Name" htmlFor="name">
                <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </Field>
              <Field label="Price (USD)" htmlFor="priceUsd" hint="Required to sell this item at the POS.">
                <Input
                  id="priceUsd"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceUsd}
                  onChange={(e) => update("priceUsd", e.target.value)}
                />
              </Field>
              <Field label="Price (KHR)" htmlFor="priceKhr">
                <Input
                  id="priceKhr"
                  type="number"
                  step="1"
                  min="0"
                  value={form.priceKhr}
                  onChange={(e) => update("priceKhr", e.target.value)}
                />
              </Field>
              <Field label="Category" htmlFor="category">
                <Input id="category" value={form.category} onChange={(e) => update("category", e.target.value)} />
              </Field>
              <Field label="Initial quantity" htmlFor="initialQty">
                <Input
                  id="initialQty"
                  type="number"
                  step="1"
                  min="0"
                  value={form.initialQty}
                  onChange={(e) => update("initialQty", e.target.value)}
                />
              </Field>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save product"}
              </Button>
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
