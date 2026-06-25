"use client"

import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Shield, ArrowRight, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/format-utils"
import type { DashboardSsl } from "@/hooks/use-dashboard"
import { ExpiryBadge } from "./helpers"

interface ExpiringSslProps {
  certs: DashboardSsl[] | undefined
  isLoading: boolean
}

export function ExpiringSsl({ certs, isLoading }: ExpiringSslProps) {
  const router = useRouter()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-muted-foreground" />
            SSL Certificates Expiring
          </CardTitle>
          <CardDescription>Certificates expiring within 90 days</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => router.push("/ssl-certificates")}>
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
        ) : !certs?.length ? (
          <div className="text-center py-10 text-muted-foreground">
            <CheckCircle2 className="size-10 mx-auto mb-3 opacity-30 text-emerald-500" />
            <p className="text-sm font-medium">No SSL certs expiring</p>
            <p className="text-xs mt-1">All certificates are valid.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {certs.slice(0, 5).map((cert) => {
              const isExpired = cert.days_to_expiry !== null && cert.days_to_expiry <= 0
              const isUrgent = cert.days_to_expiry !== null && cert.days_to_expiry > 0 && cert.days_to_expiry <= 30

              return (
                <div
                  key={cert.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/ssl-certificates/${cert.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/ssl-certificates/${cert.id}`) }}
                  className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent/50 group cursor-pointer ${
                    isExpired ? "bg-red-50/50 dark:bg-red-950/10" : isUrgent ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                  }`}
                >
                  <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                    isExpired ? "bg-red-100 dark:bg-red-900/40" : isUrgent ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"
                  }`}>
                    <Shield className={`size-4 ${
                      isExpired ? "text-red-600 dark:text-red-400" : isUrgent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {cert.common_name || cert.domain_fqdn}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{cert.domain_fqdn}</span>
                      {cert.valid_to && (
                        <>
                          <span>·</span>
                          <span className="shrink-0">Expires {formatDate(cert.valid_to)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ExpiryBadge days={cert.days_to_expiry} />
                  </div>
                </div>
              )
            })}
            {certs.length > 5 && (
              <div className="pt-2 text-center">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => router.push("/ssl-certificates")}>
                  View {certs.length - 5} more <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
