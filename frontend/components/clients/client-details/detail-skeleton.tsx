import { Skeleton } from "@/components/ui/skeleton"

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}
