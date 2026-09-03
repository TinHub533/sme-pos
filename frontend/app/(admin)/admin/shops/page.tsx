import { apiFetch, ApiError } from "@/lib/api";
import type { ShopResponse } from "@/lib/types";
import { Badge, Card, EmptyState, ErrorAlert, PageHeader } from "@/components/ui";
import ShopActions from "./ShopActions";

export default async function AdminShopsPage() {
  let shops: ShopResponse[];
  let loadError: string | null = null;

  try {
    shops = await apiFetch<ShopResponse[]>("/admin/shops");
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load shops";
    shops = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Shops" subtitle="All shops registered on this platform." />

      <ErrorAlert>{loadError}</ErrorAlert>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/60 text-gray-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Name</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Currency</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shops.map((shop) => (
              <tr key={shop.id} className="hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                  <a href={`/admin/shops/${shop.id}`} className="hover:text-brand-600 hover:underline">
                    {shop.name}
                  </a>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{shop.currencyDefault}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge tone={shop.active ? "green" : "red"}>{shop.active ? "Active" : "Suspended"}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <ShopActions shopId={shop.id} active={shop.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shops.length === 0 && !loadError && <EmptyState>No shops yet.</EmptyState>}
      </Card>
    </div>
  );
}
