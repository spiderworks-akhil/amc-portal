"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Server,
  Building2,
  Globe,
  MapPin,
  DollarSign,
  CalendarClock,
  HardDrive,
} from "lucide-react"
import type { ServerListItem } from "@/types/api"
import { formatDate, formatCurrency } from "@/lib/format-utils"
import { formatProviderType } from "./constants"

interface ServerCardProps {
  server: ServerListItem
  onClick: (id: string) => void
}

function getRenewalStatus(renewalDate?: string | null) {
  if (!renewalDate) return null

  const daysUntilRenewal = Math.ceil(
    (new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  if (daysUntilRenewal <= 0) {
    return { label: "Overdue", color: "red" as const, days: daysUntilRenewal }
  }
  if (daysUntilRenewal <= 30) {
    return {
      label: `${daysUntilRenewal}d left`,
      color: "amber" as const,
      days: daysUntilRenewal,
    }
  }
  return null
}

export function ServerCard({ server, onClick }: ServerCardProps) {
  const renewalStatus = getRenewalStatus(server.renewal_date)

  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
      onClick={() => onClick(server.id)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/10">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold leading-tight">
              {server.label}
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{server.provider_name}</span>
            </p>
          </div>
        </div>
        <Badge variant="dot" size="sm" color="blue" className="shrink-0 capitalize">
          {formatProviderType(server.provider_type)}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2 pb-3 text-sm">
        {server.ip_addresses && server.ip_addresses.length > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-mono text-xs">
              {server.ip_addresses[0]}
            </span>
            {server.ip_addresses.length > 1 && (
              <span className="text-xs">+{server.ip_addresses.length - 1}</span>
            )}
          </div>
        )}

        {server.region && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{server.region}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium text-foreground">
            {formatCurrency(server.monthly_cost, server.currency)}
          </span>
          <span>/ mo</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          <span>Renewal {formatDate(server.renewal_date)}</span>
          {renewalStatus && (
            <span
              className={
                renewalStatus.color === "red"
                  ? "font-medium text-destructive"
                  : "font-medium text-amber-600 dark:text-amber-400"
              }
            >
              · {renewalStatus.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <HardDrive className="h-3.5 w-3.5 shrink-0" />
          <span>
            {server.asset_count} project{server.asset_count !== 1 ? "s" : ""}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-0" />
    </Card>
  )
}
