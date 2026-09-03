"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Button, ErrorAlert, Field, Input } from "@/components/ui";
import type { MfaEnrollResponse } from "@/lib/types";

// Wrong-code 401s on /confirm and /disable are legitimate, not "session
// expired" — same reasoning as ChangePasswordButton — so this calls its
// Route Handlers with raw fetch, not lib/clientFetch's apiRequest.
async function postJson(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? "Something went wrong");
  }
}

export default function MfaPanel({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [enrollment, setEnrollment] = useState<MfaEnrollResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startEnroll() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Could not start MFA enrollment");
      }
      const data: MfaEnrollResponse = await res.json();
      setEnrollment(data);
      setQrDataUrl(await QRCode.toDataURL(data.otpauthUri, { margin: 1, width: 220 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start MFA enrollment");
    } finally {
      setLoading(false);
    }
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/auth/mfa/confirm", { code: confirmCode });
      setEnabled(true);
      setEnrollment(null);
      setQrDataUrl(null);
      setConfirmCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm MFA code");
    } finally {
      setLoading(false);
    }
  }

  function cancelEnroll() {
    setEnrollment(null);
    setQrDataUrl(null);
    setConfirmCode("");
    setError(null);
  }

  async function submitDisable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/auth/mfa/disable", { code: disableCode });
      setEnabled(false);
      setDisabling(false);
      setDisableCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable MFA");
    } finally {
      setLoading(false);
    }
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-green-500" />
          <p className="font-medium text-gray-900">MFA is enabled on your account.</p>
        </div>
        <p className="text-sm text-gray-500">
          You&apos;ll be asked for a code from your authenticator app every time you sign in.
        </p>

        <ErrorAlert>{error}</ErrorAlert>

        {!disabling ? (
          <Button type="button" variant="secondary" onClick={() => setDisabling(true)}>
            Disable MFA
          </Button>
        ) : (
          <form onSubmit={submitDisable} className="space-y-3">
            <Field label="Enter a current code to confirm disabling MFA" htmlFor="disableCode">
              <Input
                id="disableCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <div className="flex gap-3">
              <Button type="submit" variant="danger" disabled={loading}>
                {loading ? "Disabling…" : "Confirm disable"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDisabling(false);
                  setDisableCode("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  if (enrollment) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Scan this with an authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the
          6-digit code it shows to finish setting up MFA.
        </p>

        {qrDataUrl && (
          <img src={qrDataUrl} alt="MFA QR code" className="mx-auto rounded-lg border border-gray-100" />
        )}

        <p className="text-center text-xs text-gray-500">
          Can&apos;t scan it? Enter this code manually:{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">{enrollment.secret}</code>
        </p>

        <ErrorAlert>{error}</ErrorAlert>

        <form onSubmit={confirmEnroll} className="space-y-3">
          <Field label="Code from your authenticator app" htmlFor="confirmCode">
            <Input
              id="confirmCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Confirming…" : "Confirm and enable"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelEnroll}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-gray-300" />
        <p className="font-medium text-gray-900">MFA is not enabled.</p>
      </div>
      <p className="text-sm text-gray-500">
        Add a second factor from an authenticator app to protect this admin account.
      </p>

      <ErrorAlert>{error}</ErrorAlert>

      <Button type="button" onClick={startEnroll} disabled={loading}>
        {loading ? "Starting…" : "Set up MFA"}
      </Button>
    </div>
  );
}
