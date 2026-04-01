import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
      <div className="space-y-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="border"><CardContent className="p-4"><Skeleton className="h-40" /></CardContent></Card>
        <Card className="border lg:col-span-2"><CardContent className="p-4"><Skeleton className="h-40" /></CardContent></Card>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1 rounded-lg border overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
          <Skeleton className="h-4 w-4 rounded-full shrink-0" />
          <Skeleton className="h-4 w-28 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-1">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-56" />
    </div>
  );
}
