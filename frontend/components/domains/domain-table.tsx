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
  MoreVertical,
  Globe,
  Building2,
  RefreshCw,
  ShieldCheck,
  Clock,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import type { DomainListItem } from "@/types/api"
import { formatDate } from "@/lib/format-utils"
import { getExpiryBadge } from "./constants"

interface DomainTableProps {
  data: DomainListItem[]
  isLoading: boolean
  isDeleting?: boolean
  onDelete: (id: string) => void
  onView: (id: string) => void
}

function getExpirySortValue(daysToExpiry: number | null): number {
  if (daysToExpiry === null) return Infinity
  return daysToExpiry
}

export function DomainTable({
  data,
  isLoading,
  isDeleting,
  onDelete,
  onView,
}: DomainTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteDomain = data.find((d) => d.id === deleteId)

  // Sort domains by expiry status: expired first, then expiring soon, then active
  const sortedData = [...data].sort((a, b) => {
    const aVal = getExpirySortValue(a.days_to_expiry)
    const bVal = getExpirySortValue(b.days_to_expiry)
    return aVal - bVal
  })

  return (
    <>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Domain</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Auto-Renew</TableHead>
              <TableHead>SSL</TableHead>
              <TableHead>Last Checked</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No domains found
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((domain) => {
                const expiryBadge = getExpiryBadge(domain.days_to_expiry)
                const isExpired = domain.days_to_expiry !== null && domain.days_to_expiry <= 0
                const isExpiringSoon =
                  domain.days_to_expiry !== null &&
                  domain.days_to_expiry > 0 &&
                  domain.days_to_expiry <= 30

                return (
                  <TableRow
                    key={domain.id}
                    className={`cursor-pointer group transition-colors hover:bg-muted/40 ${
                      isExpired ? "bg-destructive/5" : isExpiringSoon ? "bg-amber-50/30 dark:bg-amber-950/20" : ""
                    }`}
                    onClick={() => onView(domain.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <span className="font-medium truncate block max-w-[220px]">
                            {domain.fqdn}
                          </span>
                          {domain.registrar_name && (
                            <span className="text-xs text-muted-foreground truncate block max-w-[220px]">
                              {domain.registrar_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3 shrink-0 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                          {domain.asset_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {domain.expiry_date ? formatDate(domain.expiry_date) : "—"}
                        </span>
                        {isExpired && (
                          <AlertTriangle className="size-3.5 text-destructive shrink-0" />
                        )}
                        {isExpiringSoon && !isExpired && (
                          <Clock className="size-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expiryBadge ? (
                        <Badge variant="dot" size="sm" color={expiryBadge.color}>
                          {expiryBadge.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {domain.auto_renew ? (
                        <div className="flex items-center gap-1.5">
                          <RefreshCw className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm text-emerald-600 dark:text-emerald-400">
                            Enabled
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Manual</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {domain.ssl_count}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {domain.last_checked_at ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 shrink-0 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(domain.last_checked_at)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
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
                                setDeleteId(domain.id)
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
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDomain?.fqdn}</strong>?
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
