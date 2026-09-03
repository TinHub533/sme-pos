import { apiFetch, ApiError } from "@/lib/api";
import type { MfaStatusResponse } from "@/lib/types";
import { Card, ErrorAlert, PageHeader } from "@/components/ui";
import MfaPanel from "./MfaPanel";

export default async function AdminSecurityPage() {
  let status: MfaStatusResponse = { enabled: false };
  let loadError: string | null = null;

  try {
    status = await apiFetch<MfaStatusResponse>("/auth/mfa/status");
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load MFA status";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Two-factor authentication for your own admin account." />

      <ErrorAlert>{loadError}</ErrorAlert>

      <Card className="max-w-lg p-6">
        <MfaPanel initialEnabled={status.enabled} />
      </Card>
    </div>
  );
}
