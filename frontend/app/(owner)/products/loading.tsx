import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { Skeleton, TableSkeleton } from "@/components/Skeleton";

export default function ProductsLoading() {
  // getSession() only decodes the already-present cookie — no network call —
  // so it's safe to call here without delaying the loading state itself.
  // Matches products/page.tsx's canManage check so the header skeleton
  // doesn't show an "Add product" placeholder for a Cashier who will never
  // see the real button once data loads.
  const session = getSession();
  const canManage = session?.role !== "ROLE_CASHIER";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Manage your catalog and stock levels."
        actions={canManage ? <Skeleton className="h-10 w-36 rounded-lg" /> : undefined}
      />
      <TableSkeleton columns={6} />
    </div>
  );
}
