"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, AlertCircle, Info, AlertOctagon, ArrowRight, Clock, List, CheckCircle2 } from "lucide-react"
import type { DashboardIncidentSummary } from "@/hooks/use-dashboard"

interface RecentIncidentsListProps {
  summary: DashboardIncidentSummary | undefined
  isLoading: boolean
}

const severityStyles: Record<string, { label: string; color: "red" | "amber" | "blue" | "gray" }> = {
  critical: { label: "Critical", color: "red" },
  major: { label: "Major", color: "amber" },
  minor: { label: "Minor", color: "blue" },
  info: { label: "Info", color: "gray" },
}

function timeSince(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function RecentIncidentsList({ summary, isLoading }: RecentIncidentsListProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-52" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) return null

  const incidents = summary.recentIncidents || []

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <List className="size-4 text-muted-foreground" />
            Recent Incidents
          </CardTitle>
          <CardDescription>Latest open incidents across all monitors</CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => router.push("/incidents?status=open")}
          >
            View all <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="size-10 mx-auto mb-3 opacity-30 text-emerald-500" />
            <p className="text-sm font-medium">No open incidents</p>
            <p className="text-xs mt-1">All monitors are running smoothly.</p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="space-y-1">
              {incidents.map((inc) => {
                const style = severityStyles[inc.severity] || severityStyles.info
                return (
                  <div
                    key={inc.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/incidents/${inc.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") router.push(`/incidents/${inc.id}`)
                    }}
                    className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent/50 group cursor-pointer"
                  >
                    <div
                      className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                        inc.severity === "critical"
                          ? "bg-red-100 dark:bg-red-900/40"
                          : inc.severity === "major"
                            ? "bg-amber-100 dark:bg-amber-900/40"
                            : inc.severity === "minor"
                              ? "bg-blue-100 dark:bg-blue-900/40"
                              : "bg-slate-100 dark:bg-slate-900/40"
                      }`}
                    >
                      {inc.severity === "critical" ? (
                        <AlertOctagon className="size-4 text-red-600 dark:text-red-400" />
                      ) : inc.severity === "major" ? (
                        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                      ) : inc.severity === "minor" ? (
                        <AlertCircle className="size-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Info className="size-4 text-slate-600 dark:text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {inc.notes ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors cursor-default">
                              {inc.monitor_name}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-xs">
                            <p className="text-xs leading-relaxed">{inc.notes}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {inc.monitor_name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate max-w-[160px]">{inc.monitor_target}</span>
                        <span>·</span>
                        <Clock className="size-3 shrink-0" />
                        <span className="shrink-0">{timeSince(inc.started_at)}</span>
                        {inc.asset_name && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[100px]">{inc.asset_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="dot" size="sm" color={style.color}>
                      {style.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
}
