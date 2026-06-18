"use client"

import { useParams, useRouter } from "next/navigation"
import { useIncident, useResolveIncident, useAcknowledgeIncident, useDeleteIncident } from "@/hooks/use-incidents"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  Activity,
  Target,
  Trash2,
  User,
  FileText,
  ExternalLink,
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
  critical: { color: "red", icon: AlertTriangle, label: "Critical", description: "Immediate attention required — service is down or severely degraded" },
  major: { color: "amber", icon: AlertCircle, label: "Major", description: "Significant impact — core functionality affected" },
  minor: { color: "blue", icon: Info, label: "Minor", description: "Low impact — isolated issue or non-critical" },
  info: { color: "gray", icon: Info, label: "Info", description: "Informational alert — no action required" },
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
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-96" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-40 w-full" />
            </div>
            <div>
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !incident) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Incident not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The incident you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <Button variant="outline" onClick={() => router.push("/incidents")}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Incidents
          </Button>
        </div>
      </div>
    )
  }

  const severityCfg = SEVERITY_CONFIG[incident.severity]
  const SeverityIcon = severityCfg.icon
  const isResolved = !!incident.resolved_at

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back + Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" onClick={() => router.push("/incidents")}>
          <ArrowLeft className="size-4 mr-1" />
          Back to Incidents
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {incident.monitor_name} Incident
              </h1>
              <Badge variant="dot" size="sm" color={severityCfg.color} className="capitalize">
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
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
              <Target className="size-4 shrink-0" />
              <span className="font-mono text-sm">{incident.monitor_target}</span>
              {incident.asset_name && (
                <>
                  <span className="text-muted-foreground/50 mx-1">·</span>
                  <span>{incident.asset_name}</span>
                </>
              )}
            </p>
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
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Severity Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SeverityIcon className="size-4" />
                {severityCfg.label} Severity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{severityCfg.description}</p>
            </CardContent>
          </Card>

          {/* Cause / Notes */}
          {(incident.cause || incident.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {incident.cause && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Cause</p>
                    <p className="text-sm">{incident.cause}</p>
                  </div>
                )}
                {incident.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{incident.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Monitor Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4" />
                Monitor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{incident.monitor_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{incident.monitor_target}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => router.push(`/monitors/${incident.monitor_id}`)}>
                  <ExternalLink className="size-3.5 mr-1.5" />
                  View Monitor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-2 rounded-full bg-destructive mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Started</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(incident.started_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {isResolved && (
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Resolved</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(incident.resolved_at!).toLocaleString()}
                    </p>
                    {incident.duration_seconds !== null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Duration: {Math.floor(incident.duration_seconds / 60)}m {incident.duration_seconds % 60}s
                      </p>
                    )}
                  </div>
                </div>
              )}

              {incident.acknowledged_by && (
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Acknowledged</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="size-3" />
                      {incident.acknowledged_by}
                    </p>
                  </div>
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
              Are you sure you want to delete this incident for <strong>{incident.monitor_name}</strong>? This action cannot be undone.
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
