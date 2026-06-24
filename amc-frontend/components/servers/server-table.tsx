"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/r-alert-dialog"
import {
  ArrowUpDown,
  MoreVertical,
  Server,
  Globe,
  MapPin,
  DollarSign,
  CalendarClock,
  HardDrive,
  Trash2,
  User,
} from "lucide-react"
import type { ServerListItem } from "@/types/api"
import { formatDate, formatCurrency } from "@/lib/format-utils"
import { formatProviderType } from "./constants"

export type ServerSortField = "label" | "provider_name" | "monthly_cost" | "renewal_date" | "created_at"

interface ServerTableProps {
  data: ServerListItem[]
  isLoading: boolean
  sortField: ServerSortField
  sortOrder: "asc" | "desc"
  isDeleting?: boolean
  onSort: (field: ServerSortField) => void
  onDelete: (id: string) => void
  onView: (id: string) => void
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

function SortHeader({
  label,
  field,
  currentField,
  order,
  onSort,
}: {
  label: string
  field: ServerSortField
  currentField: ServerSortField
  order: "asc" | "desc"
  onSort: (field: ServerSortField) => void
}) {
  const isActive = currentField === field
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`size-3 transition-opacity ${isActive ? "opacity-100" : "opacity-30"}`} />
      </div>
    </TableHead>
  )
}

export function ServerTable({
  data,
  isLoading,
  sortField,
  sortOrder,
  isDeleting,
  onSort,
  onDelete,
  onView,
}: ServerTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteServer = data.find((s) => s.id === deleteId)

  return (
    <>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <SortHeader label="Label" field="label" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Provider</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Owner</TableHead>
              <SortHeader label="Monthly Cost" field="monthly_cost" currentField={sortField} order={sortOrder} onSort={onSort} />
              <SortHeader label="Renewal Date" field="renewal_date" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Status</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  No servers found
                </TableCell>
              </TableRow>
            ) : (
              data.map((server) => {
                const renewalStatus = getRenewalStatus(server.renewal_date)

                return (
                  <TableRow
                    key={server.id}
                    className="cursor-pointer group transition-colors hover:bg-muted/40"
                    onClick={() => onView(server.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Server className="size-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[180px]">
                          {server.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                          {server.provider_name}
                        </span>
                        <Badge variant="dot" size="sm" color="blue" className="shrink-0 capitalize">
                          {formatProviderType(server.provider_type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {server.ip_addresses && server.ip_addresses.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <Globe className="size-3 shrink-0 text-muted-foreground" />
                          <span className="text-xs font-mono text-muted-foreground">
                            {server.ip_addresses[0]}
                          </span>
                          {server.ip_addresses.length > 1 && (
                            <span className="text-xs text-muted-foreground/50">
                              +{server.ip_addresses.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {server.region ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 shrink-0 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{server.region}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="size-3.5 shrink-0 text-muted-foreground" />
                        <Badge
                          variant="dot"
                          size="sm"
                          color={
                            server.owner === "SpiderWorks"
                              ? "blue"
                              : server.owner === "client"
                                ? "green"
                                : "amber"
                          }
                          className="capitalize"
                        >
                          {server.owner === "SpiderWorks"
                            ? "SpiderWorks"
                            : server.owner === "client"
                              ? "Client"
                              : "Third Party"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {server.monthly_cost ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="size-3 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {formatCurrency(server.monthly_cost, server.currency)}
                          </span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm">
                          {server.renewal_date ? formatDate(server.renewal_date) : "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {renewalStatus ? (
                        <Badge variant="dot" size="sm" color={renewalStatus.color}>
                          {renewalStatus.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <HardDrive className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {server.asset_count}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon-xs" className="size-7">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteId(server.id)
                              }}
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteServer?.label}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) onDelete(deleteId)
                setDeleteId(null)
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/80"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
