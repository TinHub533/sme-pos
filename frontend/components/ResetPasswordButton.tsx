"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorAlert, Field, Input } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { apiRequest } from "@/lib/clientFetch";

// Shared by every admin/owner-*initiated* reset (Owner→Cashier,
// Admin→Admin, Admin→shop Owner) — same shape each time: a privileged
// caller sets someone else's password directly, no current-password proof
// involved, so (unlike ChangePasswordButton) a 401 here only ever means
// "your own session expired," making lib/clientFetch's apiRequest safe to
// use as-is.
export default function ResetPasswordButton({
  apiPath,
  targetLabel,
}: {
  apiPath: string;
  targetLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function close() {
    setOpen(false);
    setNewPassword("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest(
        apiPath,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        },
        "Could not reset password",
      );
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Reset password
      </Button>

      {open && (
        <Modal onClose={close} className="max-w-sm" labelledBy="reset-password-title">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 id="reset-password-title" className="text-lg font-semibold text-gray-900">
              Reset password for {targetLabel}
            </h2>

            <ErrorAlert>{error}</ErrorAlert>

            <Field label="New password" htmlFor="newPassword" hint="At least 8 characters.">
              <Input
                id="newPassword"
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
              />
            </Field>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Reset password"}
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
