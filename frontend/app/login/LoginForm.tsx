"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { roleHomePath } from "@/lib/roles";
import type { Role } from "@/lib/types";
import { Button, Card, ErrorAlert, Field, Input } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  // Set once the backend rejects username+password with the exact message
  // "MFA_REQUIRED" (a stable value the backend guarantees, not prose to
  // pattern-match) — see AuthDtos.LoginRequest's comment. Password/username
  // stay in state and get resubmitted alongside the code on the next
  // attempt, so the user only has to type the code, not start over.
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, mfaCode: needsMfa ? mfaCode : undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.message === "MFA_REQUIRED") {
          setNeedsMfa(true);
          return;
        }
        throw new Error(body?.message ?? "Login failed");
      }
      const { role } = (await res.json()) as { role: Role | null };
      const next = searchParams.get("next") ?? (role ? roleHomePath(role) : "/dashboard");
      router.push(next);
      router.refresh(); // pick up the new cookie in Server Components
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function useDifferentCredentials() {
    setNeedsMfa(false);
    setMfaCode("");
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-sm shadow-brand-600/30">
            S
          </span>
          <span className="text-lg font-semibold text-gray-900">SME POS</span>
        </div>

        <Card className="p-6 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{needsMfa ? "Two-factor authentication" : "Sign in"}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {needsMfa ? "One more step — enter your authenticator code." : "Welcome back — enter your shop credentials."}
              </p>
            </div>

            <ErrorAlert>{error}</ErrorAlert>

            {!needsMfa ? (
              <>
                <Field label="Username" htmlFor="username">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </Field>

                <Field label="Password" htmlFor="password">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </Field>
              </>
            ) : (
              <Field
                label="Authenticator code"
                htmlFor="mfaCode"
                hint="Enter the 6-digit code from your authenticator app."
              >
                <Input
                  id="mfaCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? "Signing in…" : needsMfa ? "Verify code" : "Sign in"}
            </Button>

            {needsMfa ? (
              <p className="text-center text-sm text-gray-500">
                <button type="button" onClick={useDifferentCredentials} className="font-medium text-brand-600 hover:text-brand-700">
                  Use different credentials
                </button>
              </p>
            ) : (
              <p className="text-center text-sm text-gray-500">
                New shop?{" "}
                <a href="/onboarding" className="font-medium text-brand-600 hover:text-brand-700">
                  Set one up
                </a>
              </p>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
