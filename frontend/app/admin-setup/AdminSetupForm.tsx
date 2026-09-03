"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorAlert, Field, Input } from "@/components/ui";

const emptyForm = { name: "", username: "", password: "" };

export default function AdminSetupForm() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Could not create admin account");
      }
      router.push("/admin/shops");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create admin account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Create the first admin</h1>
        <p className="mt-1 text-sm text-gray-500">
          One-time setup — this only works while no admin account exists yet. You&apos;ll be signed in right
          after.
        </p>
      </div>

      <ErrorAlert>{error}</ErrorAlert>

      <Field label="Your name" htmlFor="name">
        <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required autoFocus />
      </Field>

      <Field label="Username" htmlFor="username">
        <Input
          id="username"
          value={form.username}
          onChange={(e) => update("username", e.target.value)}
          required
          autoComplete="username"
        />
      </Field>

      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          type="password"
          minLength={8}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          required
          autoComplete="new-password"
        />
      </Field>

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? "Creating admin…" : "Create admin account"}
      </Button>
    </form>
  );
}
