"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, ArrowUp, ArrowDown, Minus } from "lucide-react"
import type { MonitorSummary } from "@/hooks/use-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

interface MonitorHealthWidgetProps {
  summary: MonitorSummary | undefined
  isLoading: boolean
}

export function MonitorHealthWidget({ summary, isLoading }: MonitorHealthWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) return null

  const items = [
    {
      label: "Up",
      value: summary.upMonitors,
      icon: ArrowUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Down",
      value: summary.downMonitors,
      icon: ArrowDown,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
    },
    {
      label: "Unknown",
      value: summary.unknownMonitors,
      icon: Minus,
      color: "text-gray-500 dark:text-gray-400",
      bg: "bg-gray-50 dark:bg-gray-950/30",
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="size-4" />
          Monitor Health
        </CardTitle>
        <span className="text-2xl font-bold tabular-nums">{summary.totalMonitors}</span>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`size-7 rounded-md ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`size-3.5 ${item.color}`} />
                </div>
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${item.color}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
