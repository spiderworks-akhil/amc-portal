"use client"

import { useCallback, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useContract, useUpdateContract } from "@/hooks/use-contracts"

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DetailSkeleton } from "@/components/clients/client-details/detail-skeleton"
import { formatDate, formatCurrency } from "@/lib/format-utils"
import { BackButton } from "@/components/common/back-button"
import {
  FileText,
  HardDrive,
  Building2,
  DollarSign,
  CalendarClock,
  RefreshCw,
  ExternalLink,
  Mail,
  History,
  Pencil,
} from "lucide-react"
import { NotesTimeline } from "@/components/assets/asset-details/notes-timeline"
import { ContractEditDrawer } from "@/components/contracts/contract-edit-drawer"
import { ScopesSection } from "@/components/contracts/scopes-section"

const CONTRACT_STATUS_COLORS: Record<string, "emerald" | "amber" | "red" | "blue" | "gray"> = {
  active: "emerald",
  expiring: "amber",
  expired: "red",
  draft: "blue",
  terminated: "gray",
}

const ASSET_STATUS_COLORS: Record<string, "emerald" | "amber" | "blue" | "gray"> = {
  live: "emerald",
  staging: "amber",
  development: "blue",
  parked: "gray",
}

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [editOpen, setEditOpen] = useState(false)
  const updateMutation = useUpdateContract()
  const { data: contract, isLoading, isError } = useContract(id)

  const handleEditSubmit = useCallback(
    (data: {
      billing_cycle?: string
      start_date?: string
      end_date?: string
      renewal_date?: string
      amount?: number
      currency?: string
      auto_renew?: boolean
      scope?: string
      status?: string
    }) => {
      updateMutation.mutate(
        { id, ...data },
        { onSuccess: () => setEditOpen(false) },
      )
    },
    [id, updateMutation],
  )

  if (isLoading) return <DetailSkeleton />

  if (isError || !contract) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <FileText className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Contract not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The contract you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <BackButton variant="outline" label="Back to Contracts" fallbackHref="/contracts" />
        </div>
      </div>
    )
  }

  const endDate = new Date(contract.end_date)
  const now = new Date()
  const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpiringSoon = daysUntilEnd > 0 && daysUntilEnd <= 30
  const isExpired = daysUntilEnd <= 0

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <BackButton label="Back to Contracts" fallbackHref="/contracts" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {contract.contract_number || `Contract ${contract.id.slice(0, 8)}`}
              </h1>
              <Badge
                variant="dot"
                size="sm"
                color={CONTRACT_STATUS_COLORS[contract.status] ?? "gray"}
              >
                {contract.status}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Building2 className="size-4 shrink-0" />
              <button
                type="button"
                onClick={() => router.push(`/clients/${contract.client_id}`)}
                className="text-primary hover:underline text-left"
              >
                {contract.client_name}
              </button>
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5 mr-1.5" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contract.scope && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Scope</p>
                    <p className="text-sm whitespace-pre-wrap">{contract.scope}</p>
                  </div>
                </div>
              )}

              {contract.notes && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{contract.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Client</p>
                  <button
                    type="button"
                    onClick={() => router.push(`/clients/${contract.client_id}`)}
                    className="text-sm text-primary hover:underline text-left"
                  >
                    {contract.client_name}
                  </button>
                  {contract.client_email && (
                    <a href={`mailto:${contract.client_email}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                      <Mail className="size-3" />
                      {contract.client_email}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarClock className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Timeline</p>
                  <p className="text-sm">
                    {formatDate(contract.start_date)} — {formatDate(contract.end_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarClock className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Created</p>
                  <p className="text-sm">{formatDate(contract.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ScopesSection contractId={id} />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-medium">{formatCurrency(contract.amount, contract.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Billing Cycle</span>
                <span className="text-sm font-medium capitalize">{contract.billing_cycle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Start Date</span>
                <span className="text-sm font-medium">{formatDate(contract.start_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">End Date</span>
                <span className={`text-sm font-medium ${isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-600 dark:text-amber-400" : ""}`}>
                  {formatDate(contract.end_date)}
                  {isExpired && <span className="ml-1 text-xs text-destructive">(Expired)</span>}
                  {isExpiringSoon && !isExpired && <span className="ml-1 text-xs">({daysUntilEnd}d)</span>}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Renewal Date</span>
                <span className="text-sm font-medium">{formatDate(contract.renewal_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Auto-renew</span>
                {contract.auto_renew ? (
                  <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                    <RefreshCw className="size-4" />
                    Yes
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">No</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant="dot"
                  size="sm"
                  color={CONTRACT_STATUS_COLORS[contract.status] ?? "gray"}
                >
                  {contract.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Drawer */}
      <ContractEditDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEditSubmit}
        isPending={updateMutation.isPending}
        contract={contract}
      />

      {/* Activity Timeline */}
      <div className="mb-6">
        <NotesTimeline noteableType="contract" noteableId={id} />
      </div>

      {/* Linked Assets Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-4" />
            Covered Assets
          </CardTitle>
          <CardDescription>
            {contract.assets.length === 0
              ? "No assets covered by this contract"
              : `${contract.assets.length} asset${contract.assets.length > 1 ? "s" : ""}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contract.assets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <HardDrive className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No assets covered</p>
              <p className="text-xs mt-1">Link assets to this contract from the asset detail page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contract.assets.map((asset) => (
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

                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renewal History Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" />
            Renewal History
          </CardTitle>
          <CardDescription>
            {contract.renewals.length === 0
              ? "No renewals recorded for this contract"
              : `${contract.renewals.length} renewal${contract.renewals.length > 1 ? "s" : ""}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contract.renewals.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <History className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No renewals yet</p>
              <p className="text-xs mt-1">Renewal records will appear here when the contract is renewed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contract.renewals.map((renewal) => (
                <div
                  key={renewal.id}
                  className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        Renewed on {formatDate(renewal.renewed_at)}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {renewal.previous_end_date && (
                          <>
                            <span>Previous end</span>
                            <span>{formatDate(renewal.previous_end_date)}</span>
                          </>
                        )}
                        {renewal.new_start_date && (
                          <>
                            <span>New start</span>
                            <span>{formatDate(renewal.new_start_date)}</span>
                          </>
                        )}
                        {renewal.new_end_date && (
                          <>
                            <span>New end</span>
                            <span>{formatDate(renewal.new_end_date)}</span>
                          </>
                        )}
                        {renewal.amount && (
                          <>
                            <span>Amount</span>
                            <span className="font-medium">{formatCurrency(renewal.amount, contract.currency)}</span>
                          </>
                        )}
                      </div>
                      {renewal.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{renewal.notes}</p>
                      )}
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
