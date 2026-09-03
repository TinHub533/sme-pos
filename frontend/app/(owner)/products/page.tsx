import { apiFetch, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { PageResponse, ProductResponse } from "@/lib/types";
import { formatKhr, formatUsd } from "@/lib/money";
import { Badge, Card, EmptyState, ErrorAlert, PageHeader, Pagination } from "@/components/ui";
import CreateProductForm from "./CreateProductForm";
import InventoryActions from "./InventoryActions";

const PAGE_SIZE = 20;

export default async function ProductsPage({ searchParams }: { searchParams: { page?: string } }) {
  // Product creation and restock/adjust are OWNER-only on the backend
  // (@PreAuthorize("hasRole('OWNER')") on ProductController#create and both
  // InventoryController endpoints) — a Cashier hitting them would just get a
  // 403, so hide the controls rather than show an action that always fails.
  // Listing products (GET /products) has no role restriction, so Cashiers
  // still see the catalog here — they need it to look up prices/SKUs.
  const session = getSession();
  const canManage = session?.role !== "ROLE_CASHIER";

  const page = Math.max(0, Number(searchParams.page ?? "0") || 0);

  let products: ProductResponse[] = [];
  let totalPages = 1;
  let loadError: string | null = null;

  try {
    const result = await apiFetch<PageResponse<ProductResponse>>(`/products?page=${page}&size=${PAGE_SIZE}`);
    products = result.content;
    totalPages = result.totalPages;
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load products";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Manage your catalog and stock levels."
        actions={canManage ? <CreateProductForm /> : undefined}
      />

      <ErrorAlert>{loadError}</ErrorAlert>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60 text-gray-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">SKU</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Name</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Category</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Price</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">On hand</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{p.category ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {p.priceUsd != null ? (
                      <div>
                        <div className="text-gray-900">{formatUsd(p.priceUsd)}</div>
                        {p.priceKhr != null && <div className="text-xs text-gray-500">{formatKhr(p.priceKhr)}</div>}
                      </div>
                    ) : p.priceKhr != null ? (
                      <div>
                        <div className="text-gray-900">{formatKhr(p.priceKhr)}</div>
                        <Badge tone="amber" className="mt-0.5">
                          No USD price — can&apos;t be sold yet
                        </Badge>
                      </div>
                    ) : (
                      <Badge tone="red">No price set</Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={p.qtyOnHand === 0 ? "red" : p.qtyOnHand <= 5 ? "amber" : "gray"}>
                      {p.qtyOnHand}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {canManage ? <InventoryActions productId={p.id} /> : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && !loadError && <EmptyState>No products yet.</EmptyState>}
        </div>
        <Pagination page={page} totalPages={totalPages} makeHref={(p) => `/products?page=${p}`} />
      </Card>
    </div>
  );
}
