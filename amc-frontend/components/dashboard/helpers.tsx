"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getExpiryBadge } from "@/components/domains/constants"

export function ExpiryBadge({ days }: { days: number | null }) {
  const badge = getExpiryBadge(days)
  if (!badge) return <span className="text-xs text-muted-foreground/50">—</span>
  return (
    <Badge variant="dot" size="sm" color={badge.color}>
      {badge.label}
    </Badge>
  )
}

export function StatCardSkeleton() {
  return (
    <Card interactive>
      <CardContent className="pt-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
        <Skeleton className="mt-3 h-8 w-16" />
        <Skeleton className="mt-1.5 h-3 w-32" />
      </CardContent>
    </Card>
  )
}

export function ExpiryBar({
  expired = 0,
  expiring30 = 0,
  expiring60 = 0,
  healthy = 0,
  total,
}: {
  expired: number
  expiring30: number
  expiring60: number
  healthy: number
  total: number
}) {
  if (!total || total <= 0) return null

  const percentages = [
    (expired / total) * 100,
    (expiring30 / total) * 100,
    (expiring60 / total) * 100,
  ]

  const used = percentages.reduce((sum, p) => sum + p, 0)
  const healthyPct = Math.max(0, 100 - used)

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/50">
      {expired > 0 && (
        <div
          className="bg-red-500"
          style={{ width: `${percentages[0]}%` }}
        />
      )}

      {expiring30 > 0 && (
        <div
          className="bg-amber-500"
          style={{ width: `${percentages[1]}%` }}
        />
      )}

      {expiring60 > 0 && (
        <div
          className="bg-blue-500"
          style={{ width: `${percentages[2]}%` }}
        />
      )}

      {healthy > 0 && (
        <div
          className="bg-emerald-500"
          style={{ width: `${healthyPct}%` }}
        />
      )}
    </div>
  )
}