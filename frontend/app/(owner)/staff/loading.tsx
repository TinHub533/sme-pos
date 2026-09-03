import { PageHeader } from "@/components/ui";
import { Skeleton, TableSkeleton } from "@/components/Skeleton";

export default function StaffLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        subtitle="Cashier accounts for this shop."
        actions={<Skeleton className="h-10 w-36 rounded-lg" />}
      />
      <TableSkeleton columns={3} />
    </div>
  );
}
