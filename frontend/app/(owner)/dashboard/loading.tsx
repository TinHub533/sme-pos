import { Card, CardHeader, PageHeader } from "@/components/ui";
import { Skeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Today" subtitle="A snapshot of how the shop is doing right now." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="mt-4 h-8 w-24" />
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Low stock" subtitle="Items at or below their reorder threshold." />
        <ul className="divide-y divide-gray-100">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center justify-between gap-4 px-5 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
