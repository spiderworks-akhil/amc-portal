"use client"

import { useParams, useRouter } from "next/navigation"
import { useDomain } from "@/hooks/use-domains"
import { formatDate } from "@/lib/format-utils"

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DetailSkeleton } from "@/components/clients/client-details/detail-skeleton"
import {
  ArrowLeft,
  Globe,
  FileText,
  Building2,
  CalendarClock,
  RefreshCw,
  ShieldCheck,
  Clock,
  History,
  Server,
} from "lucide-react"

export default function DomainDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: domain, isLoading, isError } = useDomain(id)

  if (isLoading) return <DetailSkeleton />

  if (isError || !domain) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Globe className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Domain not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The domain you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <Button variant="outline" onClick={() => router.push("/domains")}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Domains
          </Button>
        </div>
      </div>
    )
  }

  const isExpired = domain.days_to_expiry !== null && domain.days_to_expiry <= 0
  const isExpiringSoon = domain.days_to_expiry !== null && domain.days_to_expiry > 0 && domain.days_to_expiry <= 30

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back + Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" onClick={() => router.push("/domains")}>
          <ArrowLeft className="size-4 mr-1" />
          Back to Domains
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight truncate">{domain.fqdn}</h1>
              {isExpired && (
                <Badge variant="dot" size="sm" color="red">Expired</Badge>
              )}
              {isExpiringSoon && !isExpired && (
                <Badge variant="dot" size="sm" color="amber">{domain.days_to_expiry}d left</Badge>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Building2 className="size-4 shrink-0" />
              <button
                type="button"
                onClick={() => router.push(`/assets/${domain.asset_id}`)}
                className="text-primary hover:underline text-left"
              >
                {domain.asset_name}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Left: Domain Details */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Domain Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Globe className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">FQDN</p>
                  <p className="text-sm font-mono">{domain.fqdn}</p>
                </div>
              </div>                    {domain.registrar_name && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Registrar</p>
                    <p className="text-sm">{domain.registrar_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Linked Asset</p>
                  <button
                    type="button"
                    onClick={() => router.push(`/assets/${domain.asset_id}`)}
                    className="text-sm text-primary hover:underline text-left"
                  >
                    {domain.asset_name}
                  </button>
                </div>
              </div>

              {domain.registered_date && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CalendarClock className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Registered</p>
                    <p className="text-sm">{formatDate(domain.registered_date)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarClock className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Created</p>
                  <p className="text-sm">{formatDate(domain.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nameservers Card */}
          {domain.nameservers && domain.nameservers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="size-4" />
                  Nameservers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {domain.nameservers.map((ns, i) => (
                    <span key={i} className="inline-flex items-center rounded-md border border-border/60 bg-accent/50 px-2.5 py-1 text-xs font-mono">
                      {ns}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Card */}
          {domain.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{domain.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Expiry & Auto-renew */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expiry & Renewal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expiry Date</span>
                <div className="text-right">
                  <span className={`text-sm font-medium ${isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-600 dark:text-amber-400" : ""}`}>
                    {domain.expiry_date ? formatDate(domain.expiry_date) : "—"}
                  </span>
                  {domain.days_to_expiry !== null && (
                    <p className={`text-xs ${isExpired ? "text-destructive" : "text-muted-foreground"} mt-0.5`}>
                      {isExpired
                        ? `Expired ${Math.abs(domain.days_to_expiry)} days ago`
                        : `${domain.days_to_expiry} days remaining`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Auto-renew</span>
                {domain.auto_renew ? (
                  <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                    <RefreshCw className="size-4" />
                    Enabled
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Disabled</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Checked</span>
                <span className="text-sm font-medium">
                  {domain.last_checked_at ? formatDate(domain.last_checked_at) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">SSL Certificates</span>
                <span className="text-sm font-medium">{domain.ssl_count || domain.sslCertificates?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SSL Certificates Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            SSL Certificates
          </CardTitle>
          <CardDescription>
            {!domain.sslCertificates?.length
              ? "No SSL certificates found for this domain"
              : `${domain.sslCertificates.length} certificate${domain.sslCertificates.length > 1 ? "s" : ""}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!domain.sslCertificates?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShieldCheck className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No SSL certificates</p>
              <p className="text-xs mt-1">SSL data will appear here when certificates are linked.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {domain.sslCertificates.map((cert) => {
                const validTo = cert.valid_to ? new Date(cert.valid_to) : null
                const now = new Date()
                const daysToExpiry = validTo
                  ? Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  : null
                const isCertExpired = daysToExpiry !== null && daysToExpiry <= 0
                const isCertExpiring = daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 30

                return (
                  <div
                    key={cert.id}
                    className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
                          <p className="text-sm font-medium truncate">{cert.common_name || cert.issuer || "SSL Certificate"}</p>
                          {cert.type && (
                            <span className="inline-flex items-center rounded-md border border-border/50 bg-accent/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground capitalize shrink-0">
                              {cert.type}
                            </span>
                          )}
                        </div>
                        {cert.issuer && (
                          <p className="text-xs text-muted-foreground mt-1">Issued by {cert.issuer}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                      {cert.valid_from && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider mb-0.5">Valid From</span>
                          <span>{formatDate(cert.valid_from)}</span>
                        </div>
                      )}
                      {cert.valid_to && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider mb-0.5">Valid To</span>
                          <span className={isCertExpired ? "text-destructive font-medium" : isCertExpiring ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                            {formatDate(cert.valid_to)}
                            {daysToExpiry !== null && (
                              <span className="ml-1">
                                {isCertExpired ? "(Expired)" : `(${daysToExpiry}d)`}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {cert.last_checked_at && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider mb-0.5">Last Checked</span>
                          <span>{formatDate(cert.last_checked_at)}</span>
                        </div>
                      )}
                      {cert.sans && cert.sans.length > 0 && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider mb-0.5">SANs</span>
                          <span className="truncate block" title={cert.sans.join(", ")}>
                            {cert.sans.length} subject{cert.sans.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    {cert.sans && cert.sans.length > 0 && (
                      <details className="mt-2 group">
                        <summary className="text-[10px] text-muted-foreground/60 cursor-pointer hover:text-foreground transition-colors">
                          View all {cert.sans.length} subject alternative names
                        </summary>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {cert.sans.map((san, i) => (
                            <span key={i} className="inline-flex items-center rounded-md border border-border/50 bg-accent/30 px-1.5 py-0.5 text-[10px] font-mono">
                              {san}
                            </span>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* WHOIS Snapshots Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" />
            WHOIS History
          </CardTitle>
          <CardDescription>
            {!domain.snapshots?.length
              ? "No WHOIS checks recorded yet"
              : `${domain.snapshots.length} snapshot${domain.snapshots.length > 1 ? "s" : ""} — most recent first`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!domain.snapshots?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <History className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No checks yet</p>
              <p className="text-xs mt-1">WHOIS snapshots will be recorded when a domain check is triggered.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {domain.snapshots.map((snapshot) => (
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
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                        {snapshot.registrar && (
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider mb-0.5">Registrar</span>
                            <span>{snapshot.registrar}</span>
                          </div>
                        )}
                        {snapshot.expiry_date && (
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider mb-0.5">Expiry</span>
                            <span>{formatDate(snapshot.expiry_date)}</span>
                          </div>
                        )}
                        {snapshot.nameservers && snapshot.nameservers.length > 0 && (
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider mb-0.5">Nameservers</span>
                            <span>{snapshot.nameservers.length} server{snapshot.nameservers.length > 1 ? "s" : ""}</span>
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
