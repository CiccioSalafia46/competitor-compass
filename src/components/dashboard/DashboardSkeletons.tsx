import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("rounded bg-muted-foreground/8 motion-safe:animate-pulse", className)} />;
}

export function DashboardLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1360px] space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-3 w-64" />
          </div>
          <SkeletonBlock className="hidden h-9 w-36 sm:block" />
        </div>
        <SkeletonBlock className="h-11 w-full" />
      </div>
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-5 flex items-center gap-2">
          <SkeletonBlock className="h-2.5 w-24" />
          <SkeletonBlock className="h-2.5 w-10" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-4">
            <SkeletonBlock className="h-8 w-4/5" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-9 w-32" />
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <SkeletonBlock className="mb-4 h-3 w-28" />
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-5/6" />
              <SkeletonBlock className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <SkeletonBlock className="mb-4 h-4 w-32" />
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex min-h-12 items-center gap-3 border-t py-3 first:border-t-0">
            <SkeletonBlock className="h-2 w-2 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-2/3" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        {[0, 1].map((section) => (
          <div key={section} className="rounded-xl border bg-card p-4">
            <SkeletonBlock className="mb-4 h-4 w-36" />
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex min-h-12 items-center gap-3 border-t py-3 first:border-t-0">
                <SkeletonBlock className="h-7 w-7 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-3 w-3/4" />
                  <SkeletonBlock className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
