"use client"

import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Globe, Shield, XCircle, ArrowRight } from "lucide-react"
import { formatDate } from "@/lib/format-utils"
import type { ExpiringDomain, DashboardSsl } from "@/hooks/use-dashboard"

interface ExpiredItemsProps {
  expiredDomains: ExpiringDomain[]
  expiredSsl: DashboardSsl[]
}

function ExpiredDomainRow({ domain, onClick }: { domain: ExpiringDomain; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick() }}
      className="flex items-center gap-3 rounded-lg p-2.5 bg-red-50/50 dark:bg-red-950/10 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 group cursor-pointer"
    >
      <div className="size-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
        <Globe className="size-4 text-red-600 dark:text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
          {domain.fqdn}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{domain.client_name}</span>
          {domain.expiry_date && (
            <>
              <span>·</span>
              <span className="shrink-0">Expired {formatDate(domain.expiry_date)}</span>
            </>
          )}
        </div>
      </div>
      <Badge variant="dot" size="sm" color="red">
        {Math.abs(domain.days_to_expiry ?? 0)}d ago
      </Badge>
    </div>
  )
}

function ExpiredSslRow({ cert, onClick }: { cert: DashboardSsl; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick() }}
      className="flex items-center gap-3 rounded-lg p-2.5 bg-red-50/50 dark:bg-red-950/10 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 group cursor-pointer"
    >
      <div className="size-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
        <Shield className="size-4 text-red-600 dark:text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
          {cert.common_name || cert.domain_fqdn}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{cert.domain_fqdn}</span>
          {cert.valid_to && (
            <>
              <span>·</span>
              <span className="shrink-0">Expired {formatDate(cert.valid_to)}</span>
            </>
          )}
        </div>
      </div>
      <Badge variant="dot" size="sm" color="red">
        {Math.abs(cert.days_to_expiry ?? 0)}d ago
      </Badge>
    </div>
  )
}

export function ExpiredItems({ expiredDomains, expiredSsl }: ExpiredItemsProps) {
  const router = useRouter()

  if (expiredDomains.length === 0 && expiredSsl.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {expiredDomains.length > 0 && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                <XCircle className="size-4" />
                Expired Domains
              </CardTitle>
              <CardDescription>
                {expiredDomains.length} domain{expiredDomains.length !== 1 ? "s" : ""} that have already expired
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-600" onClick={() => router.push("/domains")}>
              View all <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {expiredDomains.slice(0, 5).map((domain) => (
                <ExpiredDomainRow key={domain.id} domain={domain} onClick={() => router.push(`/domains/${domain.id}`)} />
              ))}
              {expiredDomains.length > 5 && (
                <div className="pt-2 text-center">
                  <Button variant="ghost" size="sm" className="text-xs text-red-500" onClick={() => router.push("/domains")}>
                    View {expiredDomains.length - 5} more <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {expiredSsl.length > 0 && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                <Shield className="size-4" />
                Expired SSL Certificates
              </CardTitle>
              <CardDescription>
                {expiredSsl.length} certificate{expiredSsl.length !== 1 ? "s" : ""} that have already expired
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-600" onClick={() => router.push("/ssl-certificates")}>
              View all <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {expiredSsl.slice(0, 5).map((cert) => (
                <ExpiredSslRow key={cert.id} cert={cert} onClick={() => router.push(`/ssl-certificates/${cert.id}`)} />
              ))}
              {expiredSsl.length > 5 && (
                <div className="pt-2 text-center">
                  <Button variant="ghost" size="sm" className="text-xs text-red-500" onClick={() => router.push("/ssl-certificates")}>
                    View {expiredSsl.length - 5} more <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
