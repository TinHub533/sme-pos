import { apiFetch, ApiError } from "@/lib/api";
import type { AuditLogResponse, PageResponse } from "@/lib/types";
import { Badge, Card, EmptyState, ErrorAlert, PageHeader, Pagination } from "@/components/ui";

const PAGE_SIZE = 25;

// Matches ACTION strings written by AuditLogService.record(...) call sites
// (ShopService, AdminUserService) — no central enum on the backend since
// it's just a free-text column, so this list has to be kept in sync by hand.
const ACTION_LABELS: Record<string, string> = {
  SHOP_SUSPEND: "Suspended shop",
  SHOP_REACTIVATE: "Reactivated shop",
  RESET_OWNER_PASSWORD: "Reset owner password",
  CREATE_ADMIN: "Created admin",
  RESET_ADMIN_PASSWORD: "Reset admin password",
  ADMIN_BOOTSTRAP: "Bootstrapped (first admin)",
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function AdminAuditLogPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(0, Number(searchParams.page ?? "0") || 0);

  let entries: AuditLogResponse[] = [];
  let totalPages = 1;
  let loadError: string | null = null;

  try {
    const result = await apiFetch<PageResponse<AuditLogResponse>>(`/admin/audit-log?page=${page}&size=${PAGE_SIZE}`);
    entries = result.content;
    totalPages = result.totalPages;
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load the audit log";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" subtitle="Shop suspend/reactivate, admin creation, and password resets." />

      <ErrorAlert>{loadError}</ErrorAlert>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60 text-gray-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">When</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Actor</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Action</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Target</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50/60">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDateTime(entry.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{entry.actorUsername}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone="brand">{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {entry.targetType ? `${entry.targetType} ${entry.targetId?.slice(0, 8) ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{entry.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && !loadError && <EmptyState>No admin actions recorded yet.</EmptyState>}
        </div>
        <Pagination page={page} totalPages={totalPages} makeHref={(p) => `/admin/audit-log?page=${p}`} />
      </Card>
    </div>
  );
}
