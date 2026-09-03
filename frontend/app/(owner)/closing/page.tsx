import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { todayInPhnomPenh } from "@/lib/time";
import type { DailyClosingResponse } from "@/lib/types";
import { ErrorAlert, PageHeader } from "@/components/ui";
import ReconcileForm from "./ReconcileForm";

// Belt-and-suspenders with middleware.ts: this whole page is OWNER-only,
// mirroring @PreAuthorize("hasRole('OWNER')") on DailyClosingController.
export default async function ClosingPage() {
  const session = getSession();
  if (session && session.role === "ROLE_CASHIER") redirect(roleHomePath(session.role));

  const date = todayInPhnomPenh();
  let closing: DailyClosingResponse | null = null;
  let loadError: string | null = null;

  try {
    closing = await apiFetch<DailyClosingResponse>(`/daily-closings/${date}`);
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load today's closing";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Daily closing" subtitle={date} />

      <ErrorAlert>{loadError}</ErrorAlert>

      {closing && <ReconcileForm date={date} closing={closing} />}
    </div>
  );
}
