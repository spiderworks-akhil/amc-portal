"use client"

import { useParams, useRouter } from "next/navigation"
import { useIncident, useResolveIncident, useAcknowledgeIncident, useDeleteIncident } from "@/hooks/use-incidents"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BackButton } from "@/components/common/back-button"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Activity,
  Target,
  Trash2,
  User,
  FileText,
  ExternalLink,
  Gauge,
  CalendarDays,
  Monitor,
  ListChecks,
} from "lucide-react"
import { useState } from "react"
import type { IncidentSeverity } from "@/types/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/r-alert-dialog"

const SEVERITY_CONFIG: Record<IncidentSeverity, { color: "red" | "amber" | "blue" | "gray"; icon: typeof AlertTriangle; label: string; description: string }> = {
  critical: { color: "red", icon: AlertOctagon, label: "Critical", description: "Immediate attention required — service is down or severely degraded" },
  major: { color: "amber", icon: AlertTriangle, label: "Major", description: "Significant impact — core functionality affected" },
  minor: { color: "blue", icon: AlertCircle, label: "Minor", description: "Low impact — isolated issue or non-critical" },
  info: { color: "gray", icon: Info, label: "Info", description: "Informational alert — no action required" },
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—"
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)
  return parts.join(" ")
}

export default function IncidentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: incident, isLoading, isError } = useIncident(id)
  const { mutate: resolveIncident, isPending: isResolving } = useResolveIncident()
  const { mutate: acknowledgeIncident, isPending: isAcknowledging } = useAcknowledgeIncident()
  const { mutate: deleteIncident } = useDeleteIncident()

  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-96" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !incident) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Incident not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The incident you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <BackButton variant="outline" label="Back to Incidents" fallbackHref="/incidents" />
        </div>
      </div>
    )
  }

  const severityCfg = SEVERITY_CONFIG[incident.severity]
  const SeverityIcon = severityCfg.icon
  const isResolved = !!incident.resolved_at
  const monitorStatusColor = incident.monitor_current_status === "up"
    ? "bg-emerald-500"
    : incident.monitor_current_status === "down"
      ? "bg-red-500"
      : "bg-gray-400"

  return (
    <div className="container mx-auto px-4 py-4 ">
      {/* Back button */}
      <BackButton label="Back to Incidents" fallbackHref="/incidents" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {incident.monitor_name ?? incident.cause ?? 'Incident'}
            </h1>
            <Badge variant="dot"  color={severityCfg.color} className="capitalize">
              <SeverityIcon className="size-3 mr-1" />
              {severityCfg.label}
            </Badge>
            {isResolved ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                <CheckCircle2 className="size-3" />
                Resolved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/5">
                <Clock className="size-3" />
                Open
              </span>
            )}
          </div>
          {incident.monitor_target && (
            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 font-mono text-xs">
                <Target className="size-3.5 shrink-0" />
                {incident.monitor_target}
              </span>
              {incident.asset_name && (
                <>
                  <span className="text-muted-foreground/40">|</span>
                  <span>{incident.asset_name}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!isResolved && (
            <>
              <Button size="sm" variant="outline" onClick={() => acknowledgeIncident(incident.id)} disabled={isAcknowledging}>
                <CheckCircle2 className="size-3.5 mr-1.5" />
                Acknowledge
              </Button>
              <Button size="sm" onClick={() => resolveIncident(incident.id)} disabled={isResolving}>
                <CheckCircle2 className="size-3.5 mr-1.5" />
                Resolve
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-3.5 mr-1.5" />
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Severity info card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <SeverityIcon className={`size-4 ${severityCfg.color === "red" ? "text-red-500" : severityCfg.color === "amber" ? "text-amber-500" : "text-muted-foreground"}`} />
                  {severityCfg.label} Severity
                </CardTitle>
                {incident.monitor_check_type && (
                  <span className="text-xs text-muted-foreground">
                    {incident.monitor_check_type.toUpperCase()} check
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{severityCfg.description}</p>
            </CardContent>
          </Card>

          {/* Cause / Notes */}
          {(incident.cause || incident.notes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4 text-muted-foreground" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {incident.cause && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <AlertCircle className="size-3" />
                      Cause
                    </p>
                    <p className="text-sm bg-muted/30 rounded-lg px-3 py-2">{incident.cause}</p>
                  </div>
                )}
                {incident.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <FileText className="size-3" />
                      Notes
                    </p>
                    <p className="text-sm bg-muted/30 rounded-lg px-3 py-2 whitespace-pre-wrap">{incident.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Monitor info — only shown when linked to a monitor */}
          {incident.monitor_id && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4 text-muted-foreground" />
                  Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`size-3 rounded-full ${monitorStatusColor} shrink-0`} />
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {incident.monitor_name}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          incident.monitor_current_status === "up"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : incident.monitor_current_status === "down"
                              ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              : "bg-gray-50 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400"
                        }`}>
                          {incident.monitor_current_status}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{incident.monitor_target}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => router.push(`/monitors/${incident.monitor_id}`)}>
                    <ExternalLink className="size-3.5 mr-1.5" />
                    View Monitor
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Target resource info — shown for domain/SSL expiry incidents */}
          {incident.target_type && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4 text-muted-foreground" />
                  {incident.target_type === 'domain' ? 'Expired Domain' : 'Expired SSL Certificate'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-3 rounded-full bg-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                    {incident.target_type === 'domain' ? 'Expired domain' : 'Expired SSL certificate'}
                    {incident.cause && (
                      <span className="text-muted-foreground font-normal text-xs ml-2">
                        — {incident.cause}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarDays className="size-3" />
                    {incident.target_type === 'domain' ? 'Domain' : 'SSL'} resource
                  </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(
                      incident.target_type === 'domain'
                        ? `/domains/${incident.target_id}`
                        : `/ssl-certificates/${incident.target_id}`
                    )}
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    View {incident.target_type === 'domain' ? 'Domain' : 'Certificate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4 text-muted-foreground" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />

                <div className="space-y-5">
                  {/* Started */}
                  <div className="flex items-start gap-3 relative">
                    <div className="size-[14px] shrink-0 mt-0.5 rounded-full bg-red-500 ring-2 ring-background z-10" />
                    <div>
                      <p className="text-sm font-medium">Started</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <CalendarDays className="size-3" />
                        {new Date(incident.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Acknowledged */}
                  {incident.acknowledged_by_name && (
                    <div className="flex items-start gap-3 relative">
                      <div className="size-[14px] shrink-0 mt-0.5 rounded-full bg-blue-500 ring-2 ring-background z-10" />
                      <div>
                        <p className="text-sm font-medium">Acknowledged</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <User className="size-3" />
                          {incident.acknowledged_by_name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Resolved */}
                  {isResolved && (
                    <div className="flex items-start gap-3 relative">
                      <div className="size-[14px] shrink-0 mt-0.5 rounded-full bg-emerald-500 ring-2 ring-background z-10" />
                      <div>
                        <p className="text-sm font-medium">Resolved</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <CalendarDays className="size-3" />
                          {new Date(incident.resolved_at!).toLocaleString()}
                        </p>
                        {incident.duration_seconds !== null && (
                          <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                            <Clock className="size-3" />
                            Duration: {formatDuration(incident.duration_seconds)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="size-4 text-muted-foreground" />
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Gauge className="size-3" />
                  Severity
                </span>
                <Badge variant="dot" color={severityCfg.color}>
                  {severityCfg.label}
                </Badge>
              </div>
              {incident.monitor_id && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Monitor className="size-3" />
                      Status
                    </span>
                    <span className={`text-xs font-medium capitalize ${
                      incident.monitor_current_status === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : incident.monitor_current_status === "down"
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                    }`}>
                      {incident.monitor_current_status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Activity className="size-3" />
                      Check type
                    </span>
                    <span className="text-xs font-medium uppercase">{incident.monitor_check_type}</span>
                  </div>
                </>
              )}
              {incident.acknowledged_by_name && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="size-3" />
                    Acknowledged by
                  </span>
                  <span className="text-xs font-medium">{incident.acknowledged_by_name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incident</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this incident for <strong>{incident.monitor_name ?? incident.cause ?? 'this incident'}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteIncident(incident.id, {
                  onSuccess: () => router.push("/incidents"),
                })
                setDeleteOpen(false)
              }}
              className="bg-destructive hover:bg-destructive/80"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
