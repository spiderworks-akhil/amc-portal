"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSslCertificate, useUpdateSsl, useDeleteSsl } from "@/hooks/use-ssl"
import { formatDate } from "@/lib/format-utils"
import { SslEditForm } from "@/components/assets/asset-details/ssl-edit-form"

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
import { DetailRow } from "@/components/common/detail-row"
import {
  ArrowLeft,
  ShieldCheck,
  Globe,
  Building2,
  CalendarClock,
  Clock,
  History,
  FileText,
  Pencil,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

const SSL_TYPE_LABELS: Record<string, string> = {
  dv: "Domain Validation (DV)",
  ov: "Organization Validation (OV)",
  ev: "Extended Validation (EV)",
  wildcard: "Wildcard",
}

export default function SslCertificateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: cert, isLoading, isError } = useSslCertificate(id)
  const updateMutation = useUpdateSsl()
  const deleteMutation = useDeleteSsl()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  if (isLoading) return <DetailSkeleton />

  if (isError || !cert) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldCheck className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">SSL Certificate not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The certificate you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <Button variant="outline" onClick={() => router.push("/ssl-certificates")}>
            <ArrowLeft className="size-4 mr-2" />
            Back to SSL Certificates
          </Button>
        </div>
      </div>
    )
  }

  const isExpired = cert.days_to_expiry !== null && cert.days_to_expiry <= 0
  const isExpiringSoon = cert.days_to_expiry !== null && cert.days_to_expiry > 0 && cert.days_to_expiry <= 30

  const handleEdit = (data: {
    common_name?: string
    issuer?: string
    sans?: string[]
    valid_from?: string
    valid_to?: string
    type?: string
  }) => {
    updateMutation.mutate(
      { id, ...data },
      {
        onSuccess: () => {
          toast.success("SSL certificate updated successfully")
          setEditOpen(false)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const handleDelete = () => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("SSL certificate deleted")
        router.push("/ssl-certificates")
      },
    })
  }

  const handleCopyCn = () => {
    const text = cert.common_name || cert.domain_fqdn || ""
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back + Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-muted-foreground"
          onClick={() => router.push("/ssl-certificates")}
        >
          <ArrowLeft className="size-4 mr-1" />
          Back to SSL Certificates
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {cert.common_name || cert.domain_fqdn || "SSL Certificate"}
              </h1>
              <div className="flex items-center gap-1.5">
                {isExpired && (
                  <Badge variant="dot" size="sm" color="red">
                    Expired
                  </Badge>
                )}
                {isExpiringSoon && !isExpired && (
                  <Badge variant="dot" size="sm" color="amber">
                    {cert.days_to_expiry}d left
                  </Badge>
                )}
                {!isExpired && !isExpiringSoon && cert.valid_to && (
                  <Badge variant="dot" size="sm" color="emerald">
                    Active
                  </Badge>
                )}
                {cert.type && (
                  <span className="inline-flex items-center rounded-md border border-border/50 bg-accent/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase shrink-0">
                    {cert.type}
                  </span>
                )}
              </div>
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Globe className="size-4 shrink-0" />
              <button
                type="button"
                onClick={() => router.push(`/domains?search=${encodeURIComponent(cert.domain_fqdn)}`)}
                className="text-primary hover:underline text-left"
              >
                {cert.domain_fqdn}
              </button>
              {cert.issuer && (
                <>
                  <span className="text-muted-foreground/40 mx-1">·</span>
                  <Building2 className="size-3.5 shrink-0" />
                  <span className="text-sm">{cert.issuer}</span>
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
          onClick={handleCopyCn}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          {copied ? (
            <Check className="size-3 text-emerald-500" />
          ) : (
            <Copy className="size-3" />
          )}
          {cert.common_name || cert.domain_fqdn}
        </button>
        <a
          href={`https://${cert.domain_fqdn}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          <ExternalLink className="size-3" />
          Visit
        </a>
        {cert.issuer && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3" />
            {cert.issuer}
          </span>
        )}
        {cert.asset_name && (
          <button
            onClick={() => router.push(`/assets/${cert.asset_id}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors"
          >
            <FileText className="size-3" />
            {cert.asset_name}
          </button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Left: Certificate Details */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <DetailRow
                icon={<ShieldCheck className="size-4 text-primary" />}
                iconBg="bg-primary/10"
                label="Common Name"
                value={cert.common_name || "—"}
                mono
              />
              {cert.type && (
                <DetailRow
                  icon={<ShieldCheck className="size-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Certificate Type"
                  value={SSL_TYPE_LABELS[cert.type] || cert.type}
                />
              )}
              {cert.issuer && (
                <DetailRow
                  icon={<Building2 className="size-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Issuer"
                  value={cert.issuer}
                />
              )}
              <DetailRow
                icon={<Globe className="size-4 text-primary" />}
                iconBg="bg-primary/10"
                label="Domain"
                value={
                  <button
                    type="button"
                    onClick={() => router.push(`/domains?search=${encodeURIComponent(cert.domain_fqdn)}`)}
                    className="text-primary hover:underline text-left"
                  >
                    {cert.domain_fqdn}
                  </button>
                }
              />
              {cert.asset_name && (
                <DetailRow
                  icon={<FileText className="size-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Linked Asset"
                  value={
                    <button
                      type="button"
                      onClick={() => router.push(`/assets/${cert.asset_id}`)}
                      className="text-primary hover:underline text-left"
                    >
                      {cert.asset_name}
                    </button>
                  }
                />
              )}
              {cert.valid_from && (
                <DetailRow
                  icon={<CalendarClock className="size-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Valid From"
                  value={formatDate(cert.valid_from)}
                />
              )}
              <DetailRow
                icon={<CalendarClock className="size-4 text-muted-foreground" />}
                iconBg="bg-muted"
                label="Created"
                value={formatDate(cert.created_at)}
              />
            </CardContent>
          </Card>

          {/* SANs Card */}
          {cert.sans && cert.sans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="size-4" />
                  Subject Alternative Names (SANs)
                </CardTitle>
                <CardDescription>
                  {cert.sans.length} subject{cert.sans.length > 1 ? "s" : ""} covered by this certificate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {cert.sans.map((san, i) => (
                    <span key={i} className="inline-flex items-center rounded-md border border-border/60 bg-accent/50 px-2.5 py-1 text-xs font-mono">
                      {san}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Expiry & Status */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            className={
              isExpired
                ? "border-destructive/30 dark:border-destructive/20"
                : isExpiringSoon
                  ? "border-amber-300/50 dark:border-amber-700/30"
                  : ""
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isExpired ? (
                  <AlertTriangle className="size-4 text-destructive" />
                ) : isExpiringSoon ? (
                  <Clock className="size-4 text-amber-500" />
                ) : (
                  <CalendarClock className="size-4" />
                )}
                Expiry & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {/* Expiry Date - prominent */}
              <div className="rounded-xl bg-muted/30 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valid To</span>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {cert.valid_to ? formatDate(cert.valid_to) : "—"}
                    </span>
                    {cert.days_to_expiry !== null && (
                      <p className={`text-xs mt-0.5 ${isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                        {isExpired
                          ? `Expired ${Math.abs(cert.days_to_expiry)} days ago`
                          : `${cert.days_to_expiry} days remaining`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <DetailRow
                icon={<CalendarClock className="size-4 text-muted-foreground" />}
                iconBg="bg-muted"
                label="Valid From"
                value={cert.valid_from ? formatDate(cert.valid_from) : "—"}
              />
              <DetailRow
                icon={<ShieldCheck className="size-4 text-muted-foreground" />}
                iconBg="bg-muted"
                label="Certificate Type"
                value={<span className="capitalize">{cert.type || "—"}</span>}
              />
              <DetailRow
                icon={<Clock className="size-4 text-muted-foreground" />}
                iconBg="bg-muted"
                label="Last Checked"
                value={cert.last_checked_at ? formatDate(cert.last_checked_at) : "Never"}
              />
              {cert.domain_expiry_date && (
                <DetailRow
                  icon={<Globe className="size-4 text-muted-foreground" />}
                  iconBg="bg-muted"
                  label="Domain Expiry"
                  value={formatDate(cert.domain_expiry_date)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Check History */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" />
            Check History
          </CardTitle>
          <CardDescription>
            {!cert.snapshots?.length
              ? "No checks recorded yet"
              : `${cert.snapshots.length} snapshot${cert.snapshots.length > 1 ? "s" : ""} — most recent first`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!cert.snapshots?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <History className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No checks yet</p>
              <p className="text-xs mt-1">Snapshots will be recorded when a TLS check is triggered.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cert.snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium">
                          Checked {formatDate(snapshot.checked_at)}
                        </p>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
                        {snapshot.issuer && (
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider mb-0.5">Issuer</span>
                            <span>{snapshot.issuer}</span>
                          </div>
                        )}
                        {snapshot.valid_from && (
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider mb-0.5">Valid From</span>
                            <span>{formatDate(snapshot.valid_from)}</span>
                          </div>
                        )}
                        {snapshot.valid_to && (
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider mb-0.5">Valid To</span>
                            <span>{formatDate(snapshot.valid_to)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Drawer */}
      <SslEditForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        onDelete={() => {
          setEditOpen(false)
          setDeleteOpen(true)
        }}
        isPending={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        cert={cert}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SSL Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the certificate for <strong>{cert.common_name || cert.domain_fqdn}</strong>?
              This will also remove all associated snapshots. This action cannot be undone.
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


