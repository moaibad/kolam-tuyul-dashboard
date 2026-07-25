import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoading() {
  return (
    <div aria-label="Loading portfolio" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/[0.055] bg-card/80 p-5"
          >
            <Skeleton className="mb-5 size-9 rounded-xl bg-white/[0.06]" />
            <Skeleton className="h-2.5 w-20 bg-white/[0.06]" />
            <Skeleton className="mt-3 h-5 w-28 bg-white/[0.06]" />
            <Skeleton className="mt-2 h-2 w-24 bg-white/[0.04]" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 2xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/[0.055] bg-card/80 p-6"
          >
            <div className="flex gap-3">
              <Skeleton className="size-11 rounded-2xl bg-white/[0.06]" />
              <div className="flex-1">
                <Skeleton className="h-5 w-40 bg-white/[0.06]" />
                <Skeleton className="mt-2 h-3 w-28 bg-white/[0.04]" />
              </div>
            </div>
            <Skeleton className="mt-8 h-44 w-full rounded-2xl bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}
