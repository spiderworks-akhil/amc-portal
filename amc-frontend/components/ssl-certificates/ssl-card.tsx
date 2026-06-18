"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  Globe,
  Building2,
  CalendarClock,
  HardDrive,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react"
import type { SslListItem } from "@/types/api"
import { SslWarningBadges, getSslWarnings } from "./ssl-warning-badge"
import { formatDate } from "@/lib/format-utils"
import { formatSslType, getExpiryBadge } from "./constants"

interface SslCardProps {
  cert: SslListItem
  onClick: (id: string) => void
}

export function SslCard({ cert, onClick }: SslCardProps) {
  const expiryBadge = getExpiryBadge(cert.days_to_expiry)
  const typeLabel = formatSslType(cert.type)
  const isExpired = cert.days_to_expiry !== null && cert.days_to_expiry <= 0
  const isExpiringSoon =
    cert.days_to_expiry !== null &&
    cert.days_to_expiry > 0 &&
    cert.days_to_expiry <= 30

  const title = cert.common_name || cert.domain_fqdn || "SSL Certificate"
  const warnings = getSslWarnings(cert)

  return (
    <Card
      className={`group cursor-pointer transition-all duration-300 hover:shadow-lg ${
        warnings.isExpired
          ? 'hover:border-red-300/50 dark:hover:border-red-800/30'
          : warnings.isSelfSigned || warnings.hostnameMismatch
            ? 'hover:border-orange-300/50 dark:hover:border-orange-800/30'
            : 'hover:border-primary/20'
      }`}
      onClick={() => onClick(cert.id)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${
            warnings.isExpired
              ? 'border-red-200 dark:border-red-900 bg-red-500/10'
              : warnings.isSelfSigned || warnings.hostnameMismatch
                ? 'border-orange-200 dark:border-orange-900 bg-orange-500/10'
                : 'border-primary/10 bg-primary/10'
          }`}>
            {warnings.isExpired ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : warnings.isSelfSigned ? (
              <ShieldAlert className="h-5 w-5 text-orange-500" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold leading-tight">
                {title}
              </h3>
              <SslWarningBadges
                isSelfSigned={warnings.isSelfSigned}
                hostnameMismatch={warnings.hostnameMismatch}
                isExpired={warnings.isExpired}
                compact
              />
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{cert.domain_fqdn}</span>
            </p>
          </div>
        </div>
        <div className="flex items-start gap-1.5 shrink-0">
          <SslWarningBadges
            isSelfSigned={warnings.isSelfSigned}
            hostnameMismatch={warnings.hostnameMismatch}
            isExpired={warnings.isExpired}
          />
          {typeLabel ? (
            <Badge variant="dot" size="sm" color="blue" className="uppercase">
              {typeLabel}
            </Badge>
          ) : expiryBadge ? (
            <Badge
              variant="dot"
              size="sm"
              color={expiryBadge.color}
            >
              {expiryBadge.label}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {cert.valid_to
              ? `Expires ${formatDate(cert.valid_to)}`
              : "No expiry date"}
          </span>
          {isExpired && (
            <span className="font-medium text-destructive">· Expired</span>
          )}
          {isExpiringSoon && (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              · {cert.days_to_expiry}d left
            </span>
          )}
        </div>

        {cert.issuer && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{cert.issuer}</span>
          </div>
        )}

        {cert.asset_name && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{cert.asset_name}</span>
          </div>
        )}

        {cert.valid_from && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span>Issued {formatDate(cert.valid_from)}</span>
          </div>
        )}

        {cert.sans && cert.sans.length > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>
              {cert.sans.length} SAN{cert.sans.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {cert.last_checked_at && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Checked {formatDate(cert.last_checked_at)}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0" />
    </Card>
  )
}
