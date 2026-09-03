import { apiFetch, ApiError } from "@/lib/api";
import type { OrderResponse, PageResponse } from "@/lib/types";
import { formatUsd } from "@/lib/money";
import { Badge, Card, EmptyState, ErrorAlert, PageHeader, Pagination } from "@/components/ui";
import VoidOrderButton from "./VoidOrderButton";

const PAGE_SIZE = 25;

function statusTone(status: OrderResponse["status"]): "green" | "gray" | "amber" {
  switch (status) {
    case "PAID":
      return "green";
    case "VOID":
      return "gray";
    default:
      return "amber";
  }
}

export default async function OrdersPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(0, Number(searchParams.page ?? "0") || 0);

  let orders: OrderResponse[] = [];
  let totalPages = 1;
  let loadError: string | null = null;

  try {
    const result = await apiFetch<PageResponse<OrderResponse>>(`/orders?page=${page}&size=${PAGE_SIZE}`);
    orders = result.content;
    totalPages = result.totalPages;
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load orders";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Today's orders" />

      <ErrorAlert>{loadError}</ErrorAlert>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60 text-gray-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Order</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Items</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Total</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/60">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {order.items.reduce((n, i) => n + i.qty, 0)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{formatUsd(order.total)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      {order.status === "PAID" && (
                        <a
                          href={`/orders/${order.id}/receipt`}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                          Receipt
                        </a>
                      )}
                      {order.status !== "VOID" && <VoidOrderButton orderId={order.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && !loadError && <EmptyState>No orders today yet.</EmptyState>}
        </div>
        <Pagination page={page} totalPages={totalPages} makeHref={(p) => `/orders?page=${p}`} />
      </Card>
    </div>
  );
}
