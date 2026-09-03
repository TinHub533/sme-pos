import { apiFetch, ApiError } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { formatUsd } from "@/lib/money";
import { Badge, Card, CardHeader, EmptyState, ErrorAlert, PageHeader } from "@/components/ui";

export default async function DashboardPage() {
  let summary: DashboardSummary;
  let loadError: string | null = null;

  try {
    summary = await apiFetch<DashboardSummary>("/dashboard/summary");
  } catch (err) {
    // Render the shell with an inline error rather than crashing the page —
    // a transient backend hiccup shouldn't take down the whole dashboard.
    loadError = err instanceof ApiError ? err.message : "Could not load dashboard";
    summary = { todaySalesTotal: 0, todayOrderCount: 0, lowStock: [] };
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Today" subtitle="A snapshot of how the shop is doing right now." />

      <ErrorAlert>{loadError}</ErrorAlert>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M2.5 9.5 10 4l7.5 5.5" />
                <path d="M4.5 8.5V17h11V8.5" />
                <path d="M8 17v-4.5h4V17" />
              </svg>
            </span>
            <p className="text-sm font-medium text-gray-500">Today&apos;s sales</p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
            {formatUsd(summary.todaySalesTotal)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M3 5.5h14l-1.4 8.2a1.5 1.5 0 0 1-1.5 1.3H5.9a1.5 1.5 0 0 1-1.5-1.3L3 5.5Z" />
                <path d="M7 5.5 8.2 3h3.6l1.2 2.5" />
              </svg>
            </span>
            <p className="text-sm font-medium text-gray-500">Paid orders today</p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">{summary.todayOrderCount}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Low stock" subtitle="Items at or below their reorder threshold." />
        {summary.lowStock.length === 0 ? (
          <EmptyState>Nothing below its reorder threshold.</EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100">
            {summary.lowStock.map((item) => (
              <li key={item.productId} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="font-medium text-gray-900">{item.productName}</span>
                <span className="flex items-center gap-2 text-sm text-gray-500">
                  {item.qtyOnHand} on hand
                  <Badge tone={item.qtyOnHand === 0 ? "red" : "amber"}>reorder at {item.reorderThreshold}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
