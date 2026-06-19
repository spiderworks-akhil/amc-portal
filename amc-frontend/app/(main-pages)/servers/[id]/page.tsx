"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useServer, useUpdateServer, useDeleteServer } from "@/hooks/use-servers"
import { useProviders } from "@/hooks/use-providers"
import { formatDate, formatCurrency } from "@/lib/format-utils"
import { ServerEditForm } from "@/components/servers/server-edit-form"
import { DetailRow, EmptyState } from "@/components/common/detail-row"
import { BackButton } from "@/components/common/back-button"

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DetailSkeleton } from "@/components/clients/client-details/detail-skeleton"
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
import {
  Server,
  Globe,
  ExternalLink,
  FileText,
  HardDrive,
  Building2,
  MapPin,
  DollarSign,
  CalendarClock,
  Cpu,
  Monitor,
  Pencil,
  Trash2,
  Copy,
  Check,
} from "lucide-react"
import { toast } from "sonner"

const ASSET_STATUS_COLORS: Record<string, "emerald" | "amber" | "blue" | "gray"> = {
  live: "emerald",
  staging: "amber",
  development: "blue",
  parked: "gray",
}

export default function ServerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: server, isLoading, isError } = useServer(id)
  const { data: providers } = useProviders()
  const updateMutation = useUpdateServer()
  const deleteMutation = useDeleteServer()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  if (isLoading) return <DetailSkeleton />

  if (isError || !server) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Server className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Server not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The server you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <BackButton variant="outline" label="Back to Servers" fallbackHref="/servers" />
        </div>
      </div>
    )
  }

  const handleEdit = (data: {
    label?: string
    provider_id?: string
    ip_addresses?: string[]
    region?: string
    operating_system?: string
    panel_url?: string
    monthly_cost?: number
    currency?: string
    renewal_date?: string
    notes?: string
  }) => {
    updateMutation.mutate(
      { id, ...data },
      {
        onSuccess: () => {
          toast.success("Server updated successfully")
          setEditOpen(false)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const handleDelete = () => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Server deleted")
        router.push("/servers")
      },
    })
  }

  const handleCopyLabel = () => {
    navigator.clipboard.writeText(server.label)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasRenewal = !!server.renewal_date
  const isRenewalSoon = hasRenewal && (() => {
    const diff = Math.ceil((new Date(server.renewal_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff > 0 && diff <= 30
  })()

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back + Header */}
      <div className="mb-6">
        <BackButton label="Back to Servers" fallbackHref="/servers" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {server.label}
              </h1>
              {isRenewalSoon && (
                <Badge variant="dot" size="sm" color="amber">
                  Renewal soon
                </Badge>
              )}
              {server.provider_type && (
                <span className="inline-flex items-center rounded-md border border-border/50 bg-accent/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize shrink-0">
                  {server.provider_type}
                </span>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Building2 className="size-4 shrink-0" />
              <span>{server.provider_name}</span>
              {server.region && (
                <>
                  <span className="text-muted-foreground/50 mx-1">·</span>
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="text-sm">{server.region}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive hover:border-destructive/50"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Info Bar */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleCopyLabel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          {copied ? (
            <Check className="size-3 text-emerald-500" />
          ) : (
            <Copy className="size-3" />
          )}
          {server.label}
        </button>
        {server.panel_url && (
          <a
            href={server.panel_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
          >
            <ExternalLink className="size-3" />
            Panel
          </a>
        )}
        {server.provider_name && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3" />
            {server.provider_name}
          </span>
        )}
        {server.monthly_cost && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <DollarSign className="size-3" />
            {formatCurrency(server.monthly_cost, server.currency)}/mo
          </span>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Left: Server Details */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {server.ip_addresses && server.ip_addresses.length > 0 && (
                <DetailRow
                  icon={<Globe className="size-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="IP Addresses"
                  value={
                    <div className="flex flex-wrap gap-1.5">
                      {server.ip_addresses.map((ip, i) => (
                        <span key={i} className="inline-flex items-center rounded-md border border-border/60 bg-accent/50 px-2 py-0.5 text-xs font-mono">
                          {ip}
                        </span>
                      ))}
                    </div>
                  }
                />
              )}
              {server.operating_system && (
                <DetailRow
                  icon={<Cpu className="size-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Operating System"
                  value={server.operating_system}
                />
              )}
              {server.panel_url && (
                <DetailRow
                  icon={<Monitor className="size-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Panel URL"
                  value={
                    <a
                      href={server.panel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="truncate">{server.panel_url}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  }
                />
              )}
              <DetailRow
                icon={<Building2 className="size-4 text-primary" />}
                iconBg="bg-primary/10"
                label="Provider"
                value={
                  <div>
                    <p>{server.provider_name}</p>
                    {server.provider_website && (
                      <a href={server.provider_website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                        <ExternalLink className="size-3" />
                        {server.provider_website}
                      </a>
                    )}
                  </div>
                }
              />
              <DetailRow
                icon={<CalendarClock className="size-4 text-muted-foreground" />}
                iconBg="bg-muted"
                label="Created"
                value={formatDate(server.created_at)}
              />
            </CardContent>
          </Card>

          {server.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{server.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Billing & Renewal */}
        <div className="lg:col-span-2">
          <Card
            className={
              hasRenewal && isRenewalSoon
                ? "border-amber-300/50 dark:border-amber-700/30"
                : ""
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className={`size-4 ${hasRenewal && isRenewalSoon ? "text-amber-500" : ""}`} />
                Billing & Renewal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <DetailRow
                icon={<DollarSign className="size-4 text-primary" />}
                iconBg="bg-primary/10"
                label="Monthly Cost"
                value={<span className="font-semibold">{formatCurrency(server.monthly_cost, server.currency)}</span>}
              />
              <DetailRow
                icon={<DollarSign className="size-4 text-muted-foreground" />}
                iconBg="bg-muted"
                label="Currency"
                value={<span className="capitalize">{server.currency || "—"}</span>}
              />
              <DetailRow
                icon={<CalendarClock className="size-4 text-muted-foreground" />}
                iconBg="bg-muted"
                label="Renewal Date"
                value={
                  <span className={isRenewalSoon ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                    {formatDate(server.renewal_date)}
                    {hasRenewal && isRenewalSoon && (
                      <span className="ml-1 text-xs text-amber-500">— due soon</span>
                    )}
                  </span>
                }
              />
              <DetailRow
                icon={<Building2 className="size-4 text-muted-foreground" />}
                iconBg="bg-muted"
                label="Provider Type"
                value={<span className="capitalize">{server.provider_type}</span>}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Linked Assets Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-4" />
            Linked Assets
          </CardTitle>
          <CardDescription>
            {server.assets.length === 0
              ? "No assets linked to this server"
              : `${server.assets.length} asset${server.assets.length > 1 ? "s" : ""}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {server.assets.length === 0 ? (
            <EmptyState
              icon={<HardDrive className="size-8" />}
              title="No assets linked"
              description="Link assets to this server from the asset detail page."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {server.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm group cursor-pointer"
                  onClick={() => router.push(`/assets/${asset.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/assets/${asset.id}`) }}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <HardDrive className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{asset.type_name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
                    <Badge
                      variant="dot"
                      size="sm"
                      color={ASSET_STATUS_COLORS[asset.status] ?? "gray"}
                    >
                      {asset.status}
                    </Badge>
                    {asset.primary_url && (
                      <a
                        href={asset.primary_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Drawer */}
      <ServerEditForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        onDelete={() => {
          setEditOpen(false)
          setDeleteOpen(true)
        }}
        isPending={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        providers={providers?.data ?? []}
        server={server}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{server.label}</strong>?
              All asset links will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/80"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
