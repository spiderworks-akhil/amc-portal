"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Building2,
  DollarSign,
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

export function ContractCard({ contract, onClick }: ContractCardProps) {
  const title =
    contract.contract_number || `Contract ${contract.id.slice(0, 8)}`

  const endDate = new Date(contract.end_date)
  const now = new Date()
  const daysUntilEnd = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  const isExpired = daysUntilEnd <= 0
  const isExpiringSoon = daysUntilEnd > 0 && daysUntilEnd <= 30

  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
      onClick={() => onClick(contract.id)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold leading-tight">
              {title}
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{contract.client_name}</span>
            </p>
          </div>
        </div>
        <Badge
          variant="dot"
          size="sm"
          color={CONTRACT_STATUS_COLORS[contract.status] ?? "gray"}
          className="shrink-0 capitalize"
        >
          {formatStatusLabel(contract.status)}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2 pb-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium text-foreground">
            {formatCurrency(contract.amount, contract.currency)}
          </span>
          <span>
            /{" "}
            {BILLING_CYCLE_LABELS[contract.billing_cycle] ||
              contract.billing_cycle}
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          <span>Ends {formatDate(contract.end_date)}</span>
          {isExpired && (
            <span className="font-medium text-destructive">· Expired</span>
          )}
          {isExpiringSoon && !isExpired && (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              · {daysUntilEnd}d left
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
          {contract.auto_renew ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              Auto-renew enabled
            </span>
          ) : (
            <span>Manual renewal</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <HardDrive className="h-3.5 w-3.5 shrink-0" />
          <span>
            {contract.asset_count} asset{contract.asset_count !== 1 ? "s" : ""}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-0" />
    </Card>
  )
}
