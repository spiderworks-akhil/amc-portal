"use client"

import type { MonitorCheck, MonitorCurrentStatus } from "@/types/api"

const STATUS_DOT: Record<MonitorCurrentStatus, string> = {
  up: "bg-emerald-500",
  down: "bg-red-500",
  unknown: "bg-gray-400",
}

interface MonitorCheckHistoryProps {
  checks: MonitorCheck[]
}

export function MonitorCheckHistory({ checks }: MonitorCheckHistoryProps) {
  if (checks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No checks recorded yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {checks.map((check) => (
        <div
          key={check.id}
          className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2 text-sm"
        >
          <span className={`size-2 rounded-full shrink-0 ${STATUS_DOT[check.status]}`} />
          <span className="text-xs text-muted-foreground w-16 shrink-0 font-medium uppercase">
            {check.status}
          </span>
          {check.status_code && (
            <span className="text-xs text-muted-foreground font-mono w-10 shrink-0">
              {check.status_code}
            </span>
          )}
          {check.response_time_ms !== null && (
            <span className="text-xs text-muted-foreground w-16 shrink-0">
              {check.response_time_ms}ms
            </span>
          )}
          {check.error_message && (
            <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
              {check.error_message}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {new Date(check.checked_at).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}
