"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Shield } from "lucide-react"
import type { DomainExpiryStats } from "@/hooks/use-dashboard"
import { ExpiryBar } from "./helpers"

interface DomainHealthProps {
  stats: DomainExpiryStats | undefined
  isLoading: boolean
}

export function DomainHealth({ stats, isLoading }: DomainHealthProps) {
  const breakdown = stats
    ? [
        { label: "Expired", count: stats.expired, color: "text-red-600 dark:text-red-400", barColor: "bg-red-500" },
        { label: "Within 30 days", count: stats.expiring_30_days, color: "text-amber-600 dark:text-amber-400", barColor: "bg-amber-500" },
        { label: "31–60 days", count: stats.expiring_60_days, color: "text-blue-600 dark:text-blue-400", barColor: "bg-blue-500" },
        { label: "61–90 days", count: stats.expiring_90_days, color: "text-emerald-600 dark:text-emerald-400", barColor: "bg-emerald-500" },
      ]
    : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="size-4 text-muted-foreground" />
          Domain Health
        </CardTitle>
        <CardDescription>Breakdown of domain expiration status</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <ExpiryBar
              expired={stats?.expired ?? 0}
              expiring30={stats?.expiring_30_days ?? 0}
              expiring60={stats?.expiring_60_days ?? 0}
              healthy={(stats?.total ?? 0) - (stats?.expired ?? 0) - (stats?.expiring_30_days ?? 0) - (stats?.expiring_60_days ?? 0) - (stats?.expiring_90_days ?? 0)}
              total={stats?.total ?? 0}
            />
            <div className="mt-4 space-y-1">
              {breakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`size-2.5 rounded-full ${item.barColor}`} />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${item.color}`}>
                    {item.count}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total Domains</span>
                <span className="text-sm font-bold tabular-nums">{stats?.total ?? 0}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
