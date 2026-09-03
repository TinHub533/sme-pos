"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorAlert, Field, Input, Select } from "@/components/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    shopName: "",
    currencyDefault: "USD",
    ownerUsername: "",
    ownerPassword: "",
    ownerName: "",
  });
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
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Could not create shop");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create shop");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-sm shadow-brand-600/30">
            S
          </span>
          <span className="text-lg font-semibold text-gray-900">SME POS</span>
        </div>

        <Card className="p-6 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Set up your shop</h1>
              <p className="mt-1 text-sm text-gray-500">
                Creates your shop and your Owner account together — you&apos;ll be signed in right after.
              </p>
            </div>

            <ErrorAlert>{error}</ErrorAlert>

            <Field label="Shop name" htmlFor="shopName">
              <Input
                id="shopName"
                value={form.shopName}
                onChange={(e) => update("shopName", e.target.value)}
                required
                autoFocus
              />
            </Field>

            <Field label="Default currency" htmlFor="currencyDefault">
              <Select
                id="currencyDefault"
                value={form.currencyDefault}
                onChange={(e) => update("currencyDefault", e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="KHR">KHR</option>
              </Select>
            </Field>

            <hr className="border-gray-100" />

            <Field label="Your name" htmlFor="ownerName">
              <Input
                id="ownerName"
                value={form.ownerName}
                onChange={(e) => update("ownerName", e.target.value)}
                required
              />
            </Field>

            <Field label="Username" htmlFor="ownerUsername">
              <Input
                id="ownerUsername"
                value={form.ownerUsername}
                onChange={(e) => update("ownerUsername", e.target.value)}
                required
                autoComplete="username"
              />
            </Field>

            <Field label="Password" htmlFor="ownerPassword" hint="At least 8 characters.">
              <Input
                id="ownerPassword"
                type="password"
                minLength={8}
                value={form.ownerPassword}
                onChange={(e) => update("ownerPassword", e.target.value)}
                required
                autoComplete="new-password"
              />
            </Field>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? "Creating shop…" : "Create shop"}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Already have a shop?{" "}
              <a href="/login" className="font-medium text-brand-600 hover:text-brand-700">
                Sign in
              </a>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
