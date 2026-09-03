"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorAlert, Field, Input } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { apiRequest } from "@/lib/clientFetch";

const emptyForm = { username: "", password: "", name: "" };

export default function CreateAdminForm() {
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
        "/api/admin/users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
        "Could not create admin account",
      );
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create admin account");
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
        Add admin
      </Button>

      {open && (
        <Modal onClose={close} className="max-w-md" labelledBy="add-admin-title">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 id="add-admin-title" className="text-lg font-semibold text-gray-900">
              Add admin
            </h2>

            <ErrorAlert>{error}</ErrorAlert>

            <Field label="Name" htmlFor="name">
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </Field>
            <Field label="Username" htmlFor="username">
              <Input id="username" value={form.username} onChange={(e) => update("username", e.target.value)} required />
            </Field>
            <Field label="Password" htmlFor="password" hint="At least 8 characters.">
              <Input
                id="password"
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
              />
            </Field>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Create admin"}
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
