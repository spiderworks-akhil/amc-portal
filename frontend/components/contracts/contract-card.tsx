"use client"

import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  CalendarClock,
  RefreshCw,
  HardDrive,
} from "lucide-react"
import type { ContractListItem } from "@/types/api"
import { formatDate, formatCurrency } from "@/lib/format-utils"
import {
  BILLING_CYCLE_LABELS,
  CONTRACT_STATUS_COLORS,
  formatStatusLabel,
} from "./constants"

interface ContractCardProps {
  contract: ContractListItem
  onClick: (id: string) => void
}

const STATUS_ACCENT: Record<string, string> = {
  active: "bg-emerald-500",
  expiring: "bg-amber-500",
  expired: "bg-red-500",
  draft: "bg-blue-500",
  terminated: "bg-gray-400",
}

export function ContractCard({ contract, onClick }: ContractCardProps) {
  const title = contract.label || contract.contract_number || `Contract ${contract.id.slice(0, 8)}`

  const endDate = new Date(contract.end_date)
  const now = new Date()
  const daysUntilEnd = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  const isExpired = daysUntilEnd <= 0
  const isExpiringSoon = daysUntilEnd > 0 && daysUntilEnd <= 30

  const accentBg = STATUS_ACCENT[contract.status] ?? "bg-gray-400"

  return (
    <Card interactive className="cursor-pointer relative overflow-hidden gap-1" onClick={() => onClick(contract.id)}>
      <div className={`absolute inset-x-0 top-0 h-1 z-10 rounded-t-lg ${accentBg}`} />

      <CardHeader>
        <CardAction>
          <Badge
            variant="dot"
            size="sm"
            color={CONTRACT_STATUS_COLORS[contract.status] ?? "gray"}
            className="capitalize"
          >
            {formatStatusLabel(contract.status)}
          </Badge>
        </CardAction>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{contract.client_name}</span>
        </div>
        <CardTitle className="text-sm font-semibold truncate">{title}</CardTitle>
        {contract.label && (
          <CardDescription className="truncate text-xs">
            {contract.contract_number || `ID: ${contract.id.slice(0, 8)}`}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-base font-semibold tracking-tight text-foreground shrink-0">
            {formatCurrency(contract.amount, contract.currency)}
            <span className="text-xs text-muted-foreground font-normal ml-1">
              / {BILLING_CYCLE_LABELS[contract.billing_cycle] || contract.billing_cycle}
            </span>
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
            <CalendarClock className="h-3 w-3 shrink-0" />
            <span>Ends {formatDate(contract.end_date)}</span>
            {isExpired && (
              <span className="font-medium text-destructive">· Expired</span>
            )}
            {isExpiringSoon && !isExpired && (
              <span className="font-medium text-amber-600 dark:text-amber-400">· {daysUntilEnd}d</span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" />
            {contract.auto_renew ? "Auto-renew" : "Manual renewal"}
          </span>
          <span className="flex items-center gap-1.5">
            <HardDrive className="h-3 w-3" />
            {contract.asset_count} {contract.asset_count === 1 ? "asset" : "assets"}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
