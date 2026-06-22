"use client"

import { useQueueStats } from "@/hooks/use-queues"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RefreshCw,
  Server,
  ListTodo,
  BarChart3,
  AlertTriangle,
  Loader2,
  Timer,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import type { QueueStats } from "@/types/api"

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const QUEUE_ICONS: Record<string, React.ReactNode> = {
  "monitor-checks": <Activity className="size-4" />,
  "domain-refresh": <GlobeIcon className="size-4" />,
  "ssl-refresh": <ShieldIcon className="size-4" />,
  "incident-notifications": <AlertTriangle className="size-4" />,
  "reminder-creation": <Clock className="size-4" />,
  "reminder-sending": <SendIcon className="size-4" />,
}

const QUEUE_LABELS: Record<string, string> = {
  "monitor-checks": "Monitor Checks",
  "domain-refresh": "Domain Refresh",
  "ssl-refresh": "SSL Refresh",
  "incident-notifications": "Incident Notifications",
  "reminder-creation": "Reminder Creation",
  "reminder-sending": "Reminder Sending",
}

const QUEUE_DESCRIPTIONS: Record<string, string> = {
  "monitor-checks": "Pings monitored endpoints every N seconds",
  "domain-refresh": "WHOIS/RDAP lookups for domain expiry data",
  "ssl-refresh": "TLS certificate re-checks for SSL expiry data",
  "incident-notifications": "Sends alerts when incidents are created/resolved",
  "reminder-creation": "Scans entities and creates pending reminders (every 6h)",
  "reminder-sending": "Sends due reminder emails with retry/backoff (every 1m)",
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function getSchedulerLabel(s: { pattern: string | null; id: string }): string {
  if (s.pattern === "* * * * *") return "Every minute"
  if (s.pattern === "0 */6 * * *") return "Every 6 hours"
  if (s.pattern?.startsWith("every ")) return s.pattern
  if (s.pattern) return s.pattern
  return s.id
}

export default function AdminQueuesPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQueueStats()
  const qc = useQueryClient()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <Loader2 className="size-10 animate-spin text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">Loading queue status...</h2>
          <p className="text-sm text-muted-foreground">Fetching job counts from Redis.</p>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Failed to load queue status</h2>
          <p className="text-muted-foreground max-w-sm">
            {error instanceof Error ? error.message : "Could not connect to the queues API."}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="size-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const { queues, summary } = data

  return (
    <div className="container mx-auto px-4 py-1 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Queue Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            BullMQ job queue status — auto-refreshes every 15s
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["admin-queues"] })
          }}
          disabled={isFetching}
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Server className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Queues</p>
              <p className="text-xl font-bold tabular-nums">{summary.totalQueues}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={summary.hasFailures ? "border-red-300/50 dark:border-red-800/30" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${summary.hasFailures ? "bg-red-500/10" : "bg-muted"}`}>
              <AlertCircle className={`size-5 ${summary.hasFailures ? "text-red-500" : "text-muted-foreground/60"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Failed Jobs</p>
              <p className={`text-xl font-bold tabular-nums ${summary.hasFailures ? "text-red-600 dark:text-red-400" : ""}`}>
                {formatNumber(summary.totalFailed)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Timer className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pending</p>
              <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {formatNumber(summary.totalPending)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Health</p>
              <p className="text-xl font-bold tabular-nums">
                {summary.hasFailures ? (
                  <span className="text-red-600 dark:text-red-400">Issues</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">Healthy</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {queues.map((queue) => (
          <QueueCard key={queue.name} queue={queue} />
        ))}
      </div>

      {/* Legend / Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded bg-emerald-500/30" /> Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded bg-red-500/30" /> Failed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded bg-amber-500/30" /> Pending (waiting + active + delayed)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function QueueCard({ queue }: { queue: QueueStats["queues"][number] }) {
  const { counts, schedulers, name } = queue
  const totalJobs = counts.waiting + counts.active + counts.completed + counts.failed + counts.delayed
  const hasSchedulers = schedulers.length > 0

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              {QUEUE_ICONS[name] ?? <ListTodo className="size-4" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">
                {QUEUE_LABELS[name] ?? name}
              </CardTitle>
              {QUEUE_DESCRIPTIONS[name] && (
                <CardDescription className="text-xs mt-0.5 leading-tight">
                  {QUEUE_DESCRIPTIONS[name]}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge variant="default" className="shrink-0 text-[10px] tabular-nums">
            {formatNumber(totalJobs)} jobs
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Counts grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
          <CountCell label="Waiting" value={counts.waiting} variant="warning" icon={<Clock className="size-3" />} />
          <CountCell label="Active" value={counts.active} variant="info" icon={<Play className="size-3" />} />
          <CountCell label="Completed" value={counts.completed} variant="success" icon={<CheckCircle2 className="size-3" />} />
          <CountCell label="Failed" value={counts.failed} variant="danger" icon={<AlertCircle className="size-3" />} />
          <CountCell label="Delayed" value={counts.delayed} variant="warning" icon={<Timer className="size-3" />} />
          <CountCell label="Paused" value={counts.paused} variant="muted" icon={<Pause className="size-3" />} />
        </div>

        {/* Schedulers */}
        {hasSchedulers && (
          <>
            <Separator className="mb-3" />
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">Schedulers</p>
              {schedulers.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <BarChart3 className="size-3 text-muted-foreground/50 shrink-0" />
                  <span className="text-muted-foreground/70 truncate">{s.id}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-muted-foreground/70 shrink-0">{getSchedulerLabel(s)}</span>
                  {s.next && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-muted-foreground/50 shrink-0 tabular-nums">
                        {new Date(s.next).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

const ICON_BG_COLORS: Record<string, string> = {
  success: "bg-emerald-500/10",
  danger: "bg-red-500/10",
  warning: "bg-amber-500/10",
  muted: "bg-muted",
  info: "bg-blue-500/10",
}

const ICON_TEXT_COLORS: Record<string, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  danger: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  muted: "text-muted-foreground/60",
  info: "text-blue-600 dark:text-blue-400",
}

function CountCell({
  label,
  value,
  variant,
  icon,
}: {
  label: string
  value: number
  variant: "success" | "danger" | "warning" | "muted" | "info"
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/30 p-2 text-center">
      <div className={`size-5 rounded-full flex items-center justify-center ${ICON_BG_COLORS[variant]}`}>
        <span className={ICON_TEXT_COLORS[variant]}>
          {icon}
        </span>
      </div>
      <span className="text-xs font-bold tabular-nums leading-none">{formatNumber(value)}</span>
      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider leading-none">{label}</span>
    </div>
  )
}
