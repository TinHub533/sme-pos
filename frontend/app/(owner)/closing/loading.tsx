import { todayInPhnomPenh } from "@/lib/time";
import { Card, PageHeader } from "@/components/ui";
import { Skeleton } from "@/components/Skeleton";

export default function ClosingLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Daily closing" subtitle={todayInPhnomPenh()} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-7 w-28" />
          </Card>
        ))}
      </div>

      <Card className="space-y-4 p-5">
        <Skeleton className="h-5 w-32" />
        <div className="max-w-xs">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-1.5 h-9 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </Card>
    </div>
  );
}
