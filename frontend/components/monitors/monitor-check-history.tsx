"use client"

import type { MonitorCheck, MonitorCurrentStatus } from "@/types/api"
import { ScrollArea } from "../ui/scroll-area"

const STATUS_CONFIG: Record<MonitorCurrentStatus, {
  dot: string
  border: string
  bg: string
  label: string
  textColor: string
}> = {
  up: {
    dot: "bg-emerald-500",
    border: "border-l-emerald-400",
    bg: "bg-emerald-50/40 dark:bg-emerald-950/10",
    label: "Up",
    textColor: "text-emerald-700 dark:text-emerald-400",
  },
  down: {
    dot: "bg-red-500",
    border: "border-l-red-400",
    bg: "bg-red-50/40 dark:bg-red-950/10",
    label: "Down",
    textColor: "text-red-700 dark:text-red-400",
  },
  unknown: {
    dot: "bg-gray-400",
    border: "border-l-gray-400",
    bg: "bg-gray-50/40 dark:bg-gray-950/10",
    label: "Unknown",
    textColor: "text-gray-600 dark:text-gray-400",
  },
}

const MAX_RESPONSE_BAR_WIDTH = 80

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

interface MonitorCheckHistoryProps {
  checks: MonitorCheck[]
}

export function MonitorCheckHistory({ checks }: MonitorCheckHistoryProps) {
  if (checks.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
          <ActivityIcon className="size-5 opacity-30" />
        </div>
        <p className="text-sm font-medium">No checks recorded yet</p>
        <p className="text-xs mt-1">Checks will appear here once the monitor starts running.</p>
      </div>
    )
  }

  const maxResponseTime = Math.max(
    ...checks.map(c => c.response_time_ms ?? 0),
    1
  )

return (
  <ScrollArea className="h-[400px] pr-3">
    <div className="space-y-1.5">
      {checks.map((check) => {
        const cfg = STATUS_CONFIG[check.status]
        const responseBarWidth =
          check.response_time_ms !== null
            ? Math.max(
                4,
                (check.response_time_ms / maxResponseTime) *
                  MAX_RESPONSE_BAR_WIDTH
              )
            : 0

        const checkedAt = new Date(check.checked_at)

        return (
          <div
            key={check.id}
            className={`flex items-center gap-3 rounded-lg border border-border/40 border-l-[3px] ${cfg.border} ${cfg.bg} px-3 py-2.5 text-sm transition-colors hover:border-border/60`}
          >
            <span className={`size-2 rounded-full shrink-0 ${cfg.dot}`} />

            <span
              className={`text-xs font-medium w-14 shrink-0 ${cfg.textColor}`}
            >
              {cfg.label}
            </span>

            {check.status_code !== null && (
              <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">
                {check.status_code}
              </span>
            )}

            <div className="flex items-center gap-2 min-w-0 flex-1">
              {check.response_time_ms !== null && (
                <>
                  <div className="h-1.5 rounded-full bg-muted-foreground/10 overflow-hidden min-w-[40px] max-w-[80px] w-full">
                    <div
                      className={`h-full rounded-full transition-all ${
                        check.status === "up"
                          ? "bg-emerald-400"
                          : check.status === "down"
                            ? "bg-red-400"
                            : "bg-muted-foreground/30"
                      }`}
                      style={{ width: `${responseBarWidth}px` }}
                    />
                  </div>

                  <span className="text-xs text-muted-foreground tabular-nums w-12 shrink-0">
                    {check.response_time_ms}ms
                  </span>
                </>
              )}

              {check.error_message && (
                <span className="text-xs text-red-600/70 dark:text-red-400/70 truncate min-w-0 flex-1">
                  {check.error_message}
                </span>
              )}
            </div>

            <span
              className="text-xs text-muted-foreground shrink-0 tabular-nums"
              title={checkedAt.toLocaleString()}
            >
              {formatRelativeTime(checkedAt)}
            </span>
          </div>
        )
      })}
    </div>
  </ScrollArea>
)
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
