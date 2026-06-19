"use client"

import { useMonitor, useMonitorChecks, useTriggerCheck } from "@/hooks/use-monitors"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Activity, Play, Clock, Target, Globe, FileText } from "lucide-react"
import { MonitorCheckHistory } from "./monitor-check-history"
import type { MonitorCurrentStatus, MonitorCheckType } from "@/types/api"
import { formatInterval } from "@/lib/format-utils"

interface MonitorDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  monitorId: string | null
}

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

export function MonitorDetailDrawer({
  open,
  onOpenChange,
  monitorId,
}: MonitorDetailDrawerProps) {
  const { data: monitor, isLoading } = useMonitor(monitorId)
  const { data: checksData, isLoading: checksLoading } = useMonitorChecks(monitorId)
  const { mutate: triggerCheck, isPending: isChecking } = useTriggerCheck()

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right" >
      <DrawerContent className="w-full max-h-screen overflow-y-auto overflow-x-hidden sm:max-w-[522px]">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>{monitor?.name ?? "Monitor Detail"}</DrawerTitle>
              <DrawerDescription>
                {monitor?.target ?? "Loading..."}
              </DrawerDescription>
            </div>
            {monitor && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => triggerCheck(monitor.id)}
                disabled={isChecking}
              >
                {isChecking ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Play className="size-3.5 mr-1.5" />
                )}
                Check Now
              </Button>
            )}
          </div>
        </DrawerHeader>

        {isLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : monitor ? (
          <div className="p-4 pt-0 space-y-6">
            {/* Status Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="dot" size="sm" color={STATUS_CONFIG[monitor.current_status].color} className="mt-1">
                  {STATUS_CONFIG[monitor.current_status].label}
                </Badge>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium mt-1">{TYPE_LABELS[monitor.check_type]}</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Interval</p>
                <p className="text-sm font-medium mt-1">
                  {formatInterval(monitor.interval_seconds)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Enabled</p>
                <p className="text-sm font-medium mt-1">{monitor.enabled ? "Yes" : "No"}</p>
              </div>
            </div>

            {/* Config Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Target className="size-4" />
                Configuration
              </h4>
              <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                <div className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">{monitor.target}</span>
                </div>
                {monitor.expected_status_code !== null && (
                  <div className="flex justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Expected Status</span>
                    <span>{monitor.expected_status_code}</span>
                  </div>
                )}
                {monitor.expected_keyword && (
                  <div className="flex justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Expected Keyword</span>
                    <span className="font-mono text-xs">{monitor.expected_keyword}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Asset Info */}
            {monitor.asset_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="size-4" />
                Asset: {monitor.asset_name}
              </div>
            )}

            {/* Last Checked */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              Last checked: {monitor.last_checked_at
                ? new Date(monitor.last_checked_at).toLocaleString()
                : "Never"}
            </div>

            {/* Recent Checks */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Activity className="size-4" />
                Recent Checks
              </h4>
              {checksLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <MonitorCheckHistory checks={checksData?.data ?? []} />
              )}
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
