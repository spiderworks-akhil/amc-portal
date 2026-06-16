"use client"

import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarClock, Globe, ArrowRight, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/format-utils"
import type { ExpiringDomain } from "@/hooks/use-dashboard"
import { ExpiryBadge } from "./helpers"

interface ExpiringDomainsListProps {
  domains: ExpiringDomain[] | undefined
  isLoading: boolean
}

export function ExpiringDomainsList({ domains, isLoading }: ExpiringDomainsListProps) {
  const router = useRouter()

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-muted-foreground" />
            Expiring Domains
          </CardTitle>
          <CardDescription>Domains expiring within the next 90 days</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => router.push("/domains")}>
          View all <ArrowRight className="size-3.5 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : !domains?.length ? (
          <div className="text-center py-10 text-muted-foreground">
            <CheckCircle2 className="size-10 mx-auto mb-3 opacity-30 text-emerald-500" />
            <p className="text-sm font-medium">All clear!</p>
            <p className="text-xs mt-1">No domains expiring in the next 90 days.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {domains.slice(0, 10).map((domain) => {
              const isExpired = domain.days_to_expiry !== null && domain.days_to_expiry <= 0
              const isCritical = domain.days_to_expiry !== null && domain.days_to_expiry > 0 && domain.days_to_expiry <= 7

              return (
                <div
                  key={domain.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/domains/${domain.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/domains/${domain.id}`) }}
                  className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent/50 group cursor-pointer ${
                    isExpired ? "bg-red-50/50 dark:bg-red-950/10" : isCritical ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                  }`}
                >
                  <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                    isExpired ? "bg-red-100 dark:bg-red-900/40" : isCritical ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"
                  }`}>
                    <Globe className={`size-4 ${
                      isExpired ? "text-red-600 dark:text-red-400" : isCritical ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{domain.fqdn}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{domain.client_name}</span>
                      {domain.expiry_date && (
                        <>
                          <span>·</span>
                          <span className="shrink-0">{formatDate(domain.expiry_date)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {domain.auto_renew && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        Auto
                      </span>
                    )}
                    <ExpiryBadge days={domain.days_to_expiry} />
                  </div>
                </div>
              )
            })}
            {domains.length > 10 && (
              <div className="pt-2 text-center">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => router.push("/domains")}>
                  View {domains.length - 10} more <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
