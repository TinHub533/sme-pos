"use client";

import { useState } from "react";
import { Button, ErrorAlert, Field, Input } from "@/components/ui";
import { Modal } from "@/components/Modal";

const emptyForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

// Self-service, any role — POST /auth/change-password on the backend.
// Deliberately a raw fetch, not lib/clientFetch's apiRequest: a wrong
// current password legitimately 401s here, and apiRequest treats every
// 401 as "your session expired, redirect to /login" — which would kick an
// otherwise-valid session to the login screen on a simple typo.
export default function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function close() {
    setOpen(false);
    setForm(emptyForm);
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Could not change password");
      }
      setSuccess(true);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-gray-500 hover:text-gray-900 hover:underline"
      >
        Change password
      </button>

      {open && (
        <Modal onClose={close} className="max-w-sm" labelledBy="change-password-title">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 id="change-password-title" className="text-lg font-semibold text-gray-900">
              Change password
            </h2>

            <ErrorAlert>{error}</ErrorAlert>
            {success && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Password updated.</p>
            )}

            <Field label="Current password" htmlFor="currentPassword">
              <Input
                id="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={(e) => update("currentPassword", e.target.value)}
                required
                autoFocus
                autoComplete="current-password"
              />
            </Field>
            <Field label="New password" htmlFor="newPassword" hint="At least 8 characters.">
              <Input
                id="newPassword"
                type="password"
                minLength={8}
                value={form.newPassword}
                onChange={(e) => update("newPassword", e.target.value)}
                required
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirmPassword">
              <Input
                id="confirmPassword"
                type="password"
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                required
                autoComplete="new-password"
              />
            </Field>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Change password"}
              </Button>
              <Button type="button" variant="secondary" onClick={close}>
                {success ? "Close" : "Cancel"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
