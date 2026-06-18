"use client"

import { useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMonitor, useMonitorChecks, useTriggerCheck, useUpdateMonitor } from "@/hooks/use-monitors"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MonitorCheckHistory } from "@/components/monitors/monitor-check-history"
import { MonitorEditDrawer } from "@/components/monitors/monitor-edit-drawer"
import {
  ArrowLeft,
  Activity,
  Play,
  Clock,
  Target,
  Globe,
  Pencil,
  Loader2,
} from "lucide-react"
import { useState } from "react"
import type { MonitorCurrentStatus, MonitorCheckType } from "@/types/api"

const STATUS_CONFIG: Record<MonitorCurrentStatus, { color: "emerald" | "red" | "gray"; label: string }> = {
  up: { color: "emerald", label: "Up" },
  down: { color: "red", label: "Down" },
  unknown: { color: "gray", label: "Unknown" },
}

const TYPE_LABELS: Record<MonitorCheckType, string> = {
  http: "HTTP",
  https: "HTTPS",
  tcp: "TCP",
  ping: "Ping",
  keyword: "Keyword",
}

export default function MonitorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: monitor, isLoading, isError } = useMonitor(id)
  const { data: checksData, isLoading: checksLoading } = useMonitorChecks(id)
  const { mutate: triggerCheck, isPending: isChecking } = useTriggerCheck()
  const { mutate: updateMonitor, isPending: isUpdating } = useUpdateMonitor()

  const [editOpen, setEditOpen] = useState(false)

  const handleEditSubmit = useCallback(
    (data: { name?: string; check_type?: string; target?: string; interval_seconds?: number; enabled?: boolean }) => {
      const payload: Record<string, unknown> = { ...data }
      if (data.check_type) payload.check_type = data.check_type
      updateMonitor({ id, ...payload } as Parameters<typeof updateMonitor>[0], { onSuccess: () => setEditOpen(false) })
    },
    [id, updateMonitor]
  )

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-96" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
            <div className="lg:col-span-2">
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !monitor) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Activity className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Monitor not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The monitor you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <Button variant="outline" onClick={() => router.push("/monitors")}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Monitors
          </Button>
        </div>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[monitor.current_status]

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back + Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" onClick={() => router.push("/monitors")}>
          <ArrowLeft className="size-4 mr-1" />
          Back to Monitors
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight truncate">{monitor.name}</h1>
              <Badge variant="dot" size="sm" color={statusCfg.color}>
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Globe className="size-4 shrink-0" />
              <span className="font-mono text-sm truncate">{monitor.target}</span>
              <span className="text-muted-foreground/50 mx-1">·</span>
              <span>{TYPE_LABELS[monitor.check_type]}</span>
              {monitor.asset_name && (
                <>
                  <span className="text-muted-foreground/50 mx-1">·</span>
                  <span>{monitor.asset_name}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => triggerCheck(monitor.id)} disabled={isChecking}>
              {isChecking ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Play className="size-3.5 mr-1.5" />}
              Check Now
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5 mr-1.5" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Config Details */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Target</p>
                  <p className="text-sm font-mono">{monitor.target}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Check Type</p>
                  <p className="text-sm">{TYPE_LABELS[monitor.check_type]}</p>
                </div>
              </div>

              {monitor.expected_status_code !== null && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Expected Status Code</p>
                    <p className="text-sm font-mono">{monitor.expected_status_code}</p>
                  </div>
                </div>
              )}

              {monitor.expected_keyword && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Expected Keyword</p>
                    <p className="text-sm font-mono">{monitor.expected_keyword}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Interval</p>
                  <p className="text-sm">
                    {monitor.interval_seconds >= 3600
                      ? `Every ${monitor.interval_seconds / 3600} hours`
                      : monitor.interval_seconds >= 60
                        ? `Every ${monitor.interval_seconds / 60} minutes`
                        : `Every ${monitor.interval_seconds} seconds`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4" />
                Recent Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {checksLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <MonitorCheckHistory checks={checksData?.data ?? []} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Status */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current</span>
                <Badge variant="dot" size="sm" color={statusCfg.color}>
                  {statusCfg.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Enabled</span>
                <span className={`text-sm font-medium ${monitor.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  {monitor.enabled ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Checked</span>
                <span className="text-sm text-muted-foreground">
                  {monitor.last_checked_at
                    ? new Date(monitor.last_checked_at).toLocaleString()
                    : "Never"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Asset</span>
                <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                  {monitor.asset_name || "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Drawer */}
      <MonitorEditDrawer
        key={`edit-${editOpen}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEditSubmit}
        isPending={isUpdating}
        monitor={monitor}
      />
    </div>
  )
}
