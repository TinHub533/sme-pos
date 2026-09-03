import { Card } from "@/components/ui";
import { Skeleton } from "@/components/Skeleton";

// Mirrors PosScreen's actual grid (2/3/4-col product cards + sticky cart
// sidebar) so there's no layout jump when the real client component mounts
// and takes over — this only covers the server-side product fetch in
// pos/page.tsx; PosScreen itself has no further loading state to cover.
export default function PosLoading() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">POS</h1>
          <Skeleton className="h-9 w-full rounded-lg sm:w-72" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="flex flex-col gap-2.5 p-3.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-auto h-8 w-full rounded-lg" />
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-4 w-40" />
        </Card>
      </div>
    </div>
  );
}
