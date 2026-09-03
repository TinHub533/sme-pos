import { PageHeader } from "@/components/ui";
import { TableSkeleton } from "@/components/Skeleton";

export default function AdminShopsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Shops" subtitle="All shops registered on this platform." />
      <TableSkeleton columns={4} />
    </div>
  );
}
