"use client"

import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, ArrowRight, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/format-utils"
import type { DashboardContract } from "@/hooks/use-dashboard"
import { ExpiryBadge } from "./helpers"

interface ExpiringContractsProps {
  contracts: DashboardContract[] | undefined
  isLoading: boolean
}

export function ExpiringContracts({ contracts, isLoading }: ExpiringContractsProps) {
  const router = useRouter()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-muted-foreground" />
            Contracts Up for Renewal
          </CardTitle>
          <CardDescription>Active contracts renewing within 90 days</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => router.push("/contracts")}>
          View all <ArrowRight className="size-3.5 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : !contracts?.length ? (
          <div className="text-center py-10 text-muted-foreground">
            <CheckCircle2 className="size-10 mx-auto mb-3 opacity-30 text-emerald-500" />
            <p className="text-sm font-medium">No contracts expiring soon</p>
            <p className="text-xs mt-1">All contracts are up to date.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {contracts.slice(0, 5).map((contract) => {
              const isUrgent = contract.days_to_renewal !== null && contract.days_to_renewal <= 30
              const isExpired = contract.days_to_renewal !== null && contract.days_to_renewal <= 0

              return (
                <div
                  key={contract.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/contracts/${contract.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/contracts/${contract.id}`) }}
                  className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent/50 group cursor-pointer ${
                    isExpired ? "bg-red-50/50 dark:bg-red-950/10" : isUrgent ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                  }`}
                >
                  <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                    isExpired ? "bg-red-100 dark:bg-red-900/40" : isUrgent ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"
                  }`}>
                    <FileText className={`size-4 ${
                      isExpired ? "text-red-600 dark:text-red-400" : isUrgent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{contract.client_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{contract.contract_number || contract.billing_cycle}</span>
                      <span>·</span>
                      <span className="shrink-0">{contract.renewal_date ? `Renews ${formatDate(contract.renewal_date)}` : "No renewal date"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {contract.auto_renew && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        Auto
                      </span>
                    )}
                    <ExpiryBadge days={contract.days_to_renewal} />
                  </div>
                </div>
              )
            })}
            {contracts.length > 5 && (
              <div className="pt-2 text-center">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => router.push("/contracts")}>
                  View {contracts.length - 5} more <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
