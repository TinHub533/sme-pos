import { apiFetch, ApiError } from "@/lib/api";
import type { ShopDetailResponse } from "@/lib/types";
import { Badge, Card, ErrorAlert } from "@/components/ui";
import ShopActions from "../ShopActions";
import ResetPasswordButton from "@/components/ResetPasswordButton";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso));
}

export default async function AdminShopDetailPage({ params }: { params: { shopId: string } }) {
  let shop: ShopDetailResponse | null = null;
  let loadError: string | null = null;

  try {
    shop = await apiFetch<ShopDetailResponse>(`/admin/shops/${params.shopId}`);
  } catch (err) {
    loadError = err instanceof ApiError ? err.message : "Could not load this shop";
  }

  return (
    <div className="space-y-6">
      <a href="/admin/shops" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M12.5 15 7.5 10l5-5" />
        </svg>
        All shops
      </a>

      <ErrorAlert>{loadError}</ErrorAlert>

      {shop && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{shop.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <Badge tone={shop.active ? "green" : "red"}>{shop.active ? "Active" : "Suspended"}</Badge>
                <span>Created {formatDate(shop.createdAt)}</span>
              </div>
            </div>
            <ShopActions shopId={shop.id} active={shop.active} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-sm font-medium text-gray-500">Owner</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{shop.ownerUsername ?? "—"}</p>
              {/* Platform-support case: the shop's Owner is locked out and
                  calls support. No button when there's no owner to reset
                  (shouldn't normally happen, but ownerUsername is nullable
                  in ShopDetailResponse). */}
              {shop.ownerUsername && (
                <div className="mt-3">
                  <ResetPasswordButton
                    apiPath={`/api/admin/shops/${shop.id}/reset-owner-password`}
                    targetLabel={shop.ownerUsername}
                  />
                </div>
              )}
            </Card>
            <Card className="p-5">
              <p className="text-sm font-medium text-gray-500">Currency</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{shop.currencyDefault}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-medium text-gray-500">Staff accounts</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{shop.staffCount}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-medium text-gray-500">Active products</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{shop.productCount}</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
