import { PageHeader } from "@/components/ui";
import { TableSkeleton } from "@/components/Skeleton";

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Today's orders" />
      <TableSkeleton columns={5} />
    </div>
  );
}
