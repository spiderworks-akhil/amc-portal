"use client"

import { useParams, useRouter } from "next/navigation"
import { useServer } from "@/hooks/use-servers"

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DetailSkeleton } from "@/components/clients/client-details/detail-skeleton"
import { formatDate, formatCurrency } from "@/lib/format-utils"
import {
  ArrowLeft,
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
} from "lucide-react"

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
          <Button variant="outline" onClick={() => router.push("/servers")}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Servers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" onClick={() => router.push("/servers")}>
          <ArrowLeft className="size-4 mr-1" />
          Back to Servers
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight truncate">{server.label}</h1>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Building2 className="size-4 shrink-0" />
              <span>{server.provider_name}</span>
              {server.region && (
                <>
                  <span className="text-muted-foreground/50 mx-1">·</span>
                  <MapPin className="size-4 shrink-0" />
                  <span>{server.region}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {server.ip_addresses && server.ip_addresses.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">IP Addresses</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {server.ip_addresses.map((ip, i) => (
                        <span key={i} className="inline-flex items-center rounded-md border border-border/60 bg-accent/50 px-2 py-0.5 text-xs font-mono">
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {server.operating_system && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Operating System</p>
                    <p className="text-sm">{server.operating_system}</p>
                  </div>
                </div>
              )}

              {server.panel_url && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Monitor className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Panel URL</p>
                    <a
                      href={server.panel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="truncate">{server.panel_url}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Provider</p>
                  <p className="text-sm">{server.provider_name}</p>
                  {server.provider_website && (
                    <a href={server.provider_website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                      <ExternalLink className="size-3" />
                      {server.provider_website}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarClock className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Created</p>
                  <p className="text-sm">{formatDate(server.created_at)}</p>
                </div>
              </div>
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

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Renewal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly Cost</span>
                <span className="text-sm font-medium">{formatCurrency(server.monthly_cost, server.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Currency</span>
                <span className="text-sm font-medium">{server.currency || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Renewal Date</span>
                <span className="text-sm font-medium">{formatDate(server.renewal_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Provider Type</span>
                <span className="text-sm capitalize">{server.provider_type}</span>
              </div>
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
            <div className="text-center py-10 text-muted-foreground">
              <HardDrive className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No assets linked</p>
              <p className="text-xs mt-1">Link assets to this server from the asset detail page.</p>
            </div>
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
    </div>
  )
}
