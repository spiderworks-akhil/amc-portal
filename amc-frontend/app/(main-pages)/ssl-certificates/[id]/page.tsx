"use client"

import { useParams, useRouter } from "next/navigation"
import { useSslCertificate } from "@/hooks/use-ssl"
import { formatDate } from "@/lib/format-utils"

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DetailSkeleton } from "@/components/clients/client-details/detail-skeleton"
import {
  ArrowLeft,
  ShieldCheck,
  Globe,
  Building2,
  CalendarClock,
  Clock,
  History,
  FileText,
} from "lucide-react"

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

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back + Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" onClick={() => router.push("/ssl-certificates")}>
          <ArrowLeft className="size-4 mr-1" />
          Back to SSL Certificates
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {cert.common_name || cert.domain_fqdn || "SSL Certificate"}
              </h1>
              {isExpired && (
                <Badge variant="dot" size="sm" color="red">Expired</Badge>
              )}
              {isExpiringSoon && !isExpired && (
                <Badge variant="dot" size="sm" color="amber">{cert.days_to_expiry}d left</Badge>
              )}
              {cert.type && (
                <span className="inline-flex items-center rounded-md border border-border/50 bg-accent/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase shrink-0">
                  {cert.type}
                </span>
              )}
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
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Left: Certificate Details */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Common Name</p>
                  <p className="text-sm font-mono">{cert.common_name || "—"}</p>
                </div>
              </div>

              {cert.type && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Certificate Type</p>
                    <p className="text-sm">{SSL_TYPE_LABELS[cert.type] || cert.type}</p>
                  </div>
                </div>
              )}

              {cert.issuer && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Issuer</p>
                    <p className="text-sm">{cert.issuer}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Globe className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Domain</p>
                  <button
                    type="button"
                    onClick={() => router.push(`/domains?search=${encodeURIComponent(cert.domain_fqdn)}`)}
                    className="text-sm text-primary hover:underline text-left"
                  >
                    {cert.domain_fqdn}
                  </button>
                </div>
              </div>

              {cert.asset_name && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Linked Asset</p>
                    <button
                      type="button"
                      onClick={() => router.push(`/assets/${cert.asset_id}`)}
                      className="text-sm text-primary hover:underline text-left"
                    >
                      {cert.asset_name}
                    </button>
                  </div>
                </div>
              )}

              {cert.valid_from && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CalendarClock className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Valid From</p>
                    <p className="text-sm">{formatDate(cert.valid_from)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarClock className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Created</p>
                  <p className="text-sm">{formatDate(cert.created_at)}</p>
                </div>
              </div>
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

        {/* Right: Expiry Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expiry & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valid To</span>
                <div className="text-right">
                  <span className={`text-sm font-medium ${isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-600 dark:text-amber-400" : ""}`}>
                    {cert.valid_to ? formatDate(cert.valid_to) : "—"}
                  </span>
                  {cert.days_to_expiry !== null && (
                    <p className={`text-xs ${isExpired ? "text-destructive" : "text-muted-foreground"} mt-0.5`}>
                      {isExpired
                        ? `Expired ${Math.abs(cert.days_to_expiry)} days ago`
                        : `${cert.days_to_expiry} days remaining`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valid From</span>
                <span className="text-sm font-medium">
                  {cert.valid_from ? formatDate(cert.valid_from) : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Certificate Type</span>
                <span className="text-sm font-medium capitalize">{cert.type || "—"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Checked</span>
                <span className="text-sm font-medium">
                  {cert.last_checked_at ? formatDate(cert.last_checked_at) : "—"}
                </span>
              </div>

              {cert.domain_expiry_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Domain Expiry</span>
                  <span className="text-sm font-medium">{formatDate(cert.domain_expiry_date)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Check Snapshots Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" />
            Check History
          </CardTitle>
          <CardDescription>
            {!cert.snapshots?.length
              ? "No checks recorded yet"
              : `${cert.snapshots.length} snapshot${cert.snapshots.length > 1 ? "s" : ""} — most recent first`
            }
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
    </div>
  )
}
