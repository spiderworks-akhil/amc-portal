"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, AlertCircle, Info, AlertOctagon } from "lucide-react"
import type { DashboardIncidentSummary } from "@/hooks/use-dashboard"

interface IncidentHealthWidgetProps {
  summary: DashboardIncidentSummary | undefined
  isLoading: boolean
}

const severityConfig = {
  critical: {
    label: "Critical",
    icon: AlertOctagon,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    badgeColor: "red" as const,
  },
  major: {
    label: "Major",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    badgeColor: "amber" as const,
  },
  minor: {
    label: "Minor",
    icon: AlertCircle,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    badgeColor: "blue" as const,
  },
  info: {
    label: "Info",
    icon: Info,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/30",
    badgeColor: "gray" as const,
  },
} as const

function timeSince(dateStr: string) {
  const now = Date.now()
  const ms = now - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function IncidentHealthWidget({ summary, isLoading }: IncidentHealthWidgetProps) {
  const router = useRouter()

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
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) return null

  const severityItems = [
    { key: "critical" as const, value: summary.critical },
    { key: "major" as const, value: summary.major },
    { key: "minor" as const, value: summary.minor },
    { key: "info" as const, value: summary.info },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className={`size-4 ${summary.totalOpen > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          Open Incidents
        </CardTitle>
        <span
          role="button"
          tabIndex={0}
          onClick={() => router.push("/incidents?status=open")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") router.push("/incidents?status=open")
          }}
          className={`text-2xl font-bold tabular-nums cursor-pointer hover:underline ${
            summary.totalOpen > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {summary.totalOpen}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Severity breakdown — clickable rows filter by severity */}
        <div className="space-y-0.5">
          {severityItems.map(({ key, value }) => {
            const cfg = severityConfig[key]
            return (
              <div
                key={key}
                {...(value > 0
                  ? {
                      role: "button" as const,
                      tabIndex: 0,
                      onClick: () => router.push(`/incidents?severity=${key}`),
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") router.push(`/incidents?severity=${key}`)
                      },
                    }
                  : {})}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${
                  value > 0
                    ? "cursor-pointer hover:bg-accent/50"
                    : "opacity-50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`size-7 rounded-md ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <cfg.icon className={`size-3.5 ${cfg.color}`} />
                  </div>
                  <span className="text-sm text-muted-foreground truncate">{cfg.label}</span>
                </div>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${value > 0 ? cfg.color : "text-muted-foreground/50"}`}>
                  {value}
                </span>
              </div>
            )
          })}
        </div>


      </CardContent>
    </Card>
  )
}
