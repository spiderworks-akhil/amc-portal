"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, HardDrive, FileText, Globe } from "lucide-react"
import type { DashboardSummary, DomainExpiryStats } from "@/hooks/use-dashboard"
import { StatCardSkeleton } from "./helpers"

interface StatCardsProps {
  summary: DashboardSummary | undefined
  expiryStats: DomainExpiryStats | undefined
  isLoading: boolean
}

export function StatCards({ summary, expiryStats, isLoading }: StatCardsProps) {
  const statCards = summary
    ? [
        {
          label: "Total Clients",
          value: summary.totalClients,
          icon: Users,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-950/30",
        },
        {
          label: "Total Assets",
          value: summary.totalAssets,
          icon: HardDrive,
          color: "text-violet-600 dark:text-violet-400",
          bg: "bg-violet-50 dark:bg-violet-950/30",
        },
        {
          label: "Active Contracts",
          value: summary.activeContracts,
          icon: FileText,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
        },
        {
          label: "Total Domains",
          value: summary.totalDomains,
          icon: Globe,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-950/30",
          subtitle: expiryStats
            ? `${expiryStats.expired + expiryStats.expiring_30_days} need attention`
            : undefined,
        },
      ]
    : []

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        : statCards.map((card) => (
            <Card key={card.label} interactive>
              <CardContent className="pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <div className={`size-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`size-4.5 ${card.color}`} />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
                  {card.value.toLocaleString()}
                </p>
                {card.subtitle && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400 font-medium">
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
    </div>
  )
}
