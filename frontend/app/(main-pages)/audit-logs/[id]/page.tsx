"use client"

import { useParams, useRouter } from "next/navigation"
import { useAuditLog } from "@/hooks/use-audit-logs"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BackButton } from "@/components/common/back-button"
import {
  ArrowLeft,
  AlertTriangle,
  User,
  Globe,
  HardDrive,
  FileText,
  Shield,
  Server,
  Activity,
  AlertCircle,
  Clock,
  Fingerprint,
  UserPlus,
  Edit,
  Trash2,
  LogIn,
  Archive,
  RotateCcw,
  Code2,
} from "lucide-react"
import Link from "next/link"

const ACTION_CONFIG: Record<string, { icon: typeof Edit; color: "emerald" | "blue" | "red" | "gray"; label: string }> = {
  create: { icon: UserPlus, color: "emerald", label: "Create" },
  update: { icon: Edit, color: "blue", label: "Update" },
  delete: { icon: Trash2, color: "red", label: "Delete" },
  login: { icon: LogIn, color: "emerald", label: "Login" },
  logout: { icon: LogIn, color: "gray", label: "Logout" },
  archive: { icon: Archive, color: "gray", label: "Archive" },
  restore: { icon: RotateCcw, color: "blue", label: "Restore" },
}

const ENTITY_LINKS: Record<string, string> = {
  client: "/clients",
  asset: "/projects",
  contract: "/contracts",
  domain: "/domains",
  ssl: "/ssl-certificates",
  server: "/servers",
  monitor: "/monitors",
  incident: "/incidents",
  provider: "/servers",
}

function DiffView({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) {
    return <p className="text-xs text-muted-foreground">No data captured for this entry</p>
  }

  const allKeys = new Set<string>()
  if (before) Object.keys(before).forEach((k) => allKeys.add(k))
  if (after) Object.keys(after).forEach((k) => allKeys.add(k))

  const changedKeys = Array.from(allKeys).filter((key) => {
    const b = before?.[key]
    const a = after?.[key]
    return JSON.stringify(b) !== JSON.stringify(a)
  })

  if (changedKeys.length === 0 && !before && !after) {
    return <p className="text-xs text-muted-foreground">No changes recorded</p>
  }

  if (changedKeys.length === 0) {
    return (
      <div className="space-y-1">
        {Array.from(allKeys).map((key) => (
          <div key={key} className="flex items-start gap-3 text-xs py-1.5 border-b border-border/30 last:border-0">
            <span className="font-medium text-muted-foreground w-32 shrink-0">{key}</span>
            <span className="font-mono text-muted-foreground">
              {JSON.stringify(after?.[key] ?? before?.[key] ?? "")}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {changedKeys.map((key) => {
        const beforeVal = before?.[key]
        const afterVal = after?.[key]
        const beforeStr = beforeVal !== undefined ? JSON.stringify(beforeVal) : "(empty)"
        const afterStr = afterVal !== undefined ? JSON.stringify(afterVal) : "(empty)"

        return (
          <div key={key} className="flex items-start gap-3 text-xs py-2 border-b border-border/30 last:border-0">
            <span className="font-medium text-muted-foreground w-32 shrink-0">{key}</span>
            <div className="flex-1 space-y-1 min-w-0">
              {before && (
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold shrink-0 mt-px">−</span>
                  <span className="font-mono text-red-500/80 bg-red-500/5 rounded px-1.5 py-0.5 break-all line-through">
                    {beforeStr}
                  </span>
                </div>
              )}
              {after && (
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold shrink-0 mt-px">+</span>
                  <span className="font-mono text-emerald-500/80 bg-emerald-500/5 rounded px-1.5 py-0.5 break-all">
                    {afterStr}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AuditLogDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: log, isLoading, isError } = useAuditLog(id)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !log) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Audit log entry not found</h2>
          <p className="text-muted-foreground max-w-sm">
            This audit log entry doesn&apos;t exist or may have been removed.
          </p>
          <BackButton variant="outline" label="Back to Audit Logs" fallbackHref="/audit-logs" />
        </div>
      </div>
    )
  }

  const actionCfg = ACTION_CONFIG[log.action] ?? { icon: Edit, color: "gray" as const, label: log.action }
  const ActionIcon = actionCfg.icon
  const entityLink = ENTITY_LINKS[log.entity_type]

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <BackButton label="Back" fallbackHref="/audit-logs" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Audit Log Entry</h1>
            <Badge variant="dot" size="sm" color={actionCfg.color} className="capitalize">
              <ActionIcon className="size-3 mr-1" />
              {actionCfg.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {new Date(log.created_at).toLocaleString()}
            </span>
            {log.ip && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <Fingerprint className="size-3" />
                  {log.ip}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Diff */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Code2 className="size-4 text-muted-foreground" />
                Data Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DiffView before={log.before} after={log.after} />
            </CardContent>
          </Card>
        </div>

        {/* Right column — Meta */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="size-4 text-muted-foreground" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Action</span>
                <Badge variant="dot" size="sm" color={actionCfg.color} className="capitalize">
                  <ActionIcon className="size-3 mr-1" />
                  {actionCfg.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Entity Type</span>
                <span className="text-xs font-medium capitalize">{log.entity_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Entity ID</span>
                <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">
                  {log.entity_id}
                </span>
              </div>
              {entityLink && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => router.push(`${entityLink}/${log.entity_id}`)}
                >
                  <ArrowLeft className="size-3.5 mr-1.5 rotate-180" />
                  View {log.entity_type}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4 text-muted-foreground" />
                Actor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {log.actor_name ? (
                <div>
                  <p className="text-sm font-medium">{log.actor_name}</p>
                  {log.actor_email && (
                    <p className="text-xs text-muted-foreground mt-0.5">{log.actor_email}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">System / Automated</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
