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
  ShieldCheck,
  Globe,
  ExternalLink,
  Trash2,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react"
import type { SslListItem } from "@/types/api"
import { SslWarningBadges } from "./ssl-warning-badge"
import { formatSslType, getExpiryBadge } from "./constants"
import { formatDate } from "@/lib/format-utils"

export type SslSortField = "common_name" | "issuer" | "valid_to" | "valid_from" | "last_checked_at" | "created_at"

interface SslTableProps {
  data: SslListItem[]
  isLoading: boolean
  sortField: SslSortField
  sortOrder: "asc" | "desc"
  isDeleting?: boolean
  onSort: (field: SslSortField) => void
  onDelete: (id: string) => void
  onView: (id: string) => void
}

function SortHeader({
  label,
  field,
  currentField,
  order,
  onSort,
}: {
  label: string
  field: SslSortField
  currentField: SslSortField
  order: "asc" | "desc"
  onSort: (field: SslSortField) => void
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

export function SslTable({
  data,
  isLoading,
  sortField,
  sortOrder,
  isDeleting,
  onSort,
  onDelete,
  onView,
}: SslTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteCert = data.find((c) => c.id === deleteId)

  return (
    <>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <SortHeader label="Common Name" field="common_name" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Type</TableHead>
              <SortHeader label="Issuer" field="issuer" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Domain</TableHead>
              <SortHeader label="Valid To" field="valid_to" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Status</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No SSL certificates found
                </TableCell>
              </TableRow>
            ) : (
              data.map((cert) => {
                const expiryBadge = getExpiryBadge(cert.days_to_expiry)
                const typeLabel = formatSslType(cert.type)
                const isExpired = cert.days_to_expiry !== null && cert.days_to_expiry <= 0
                const isExpiringSoon = cert.days_to_expiry !== null && cert.days_to_expiry > 0 && cert.days_to_expiry <= 30

                return (
                  <TableRow
                    key={cert.id}
                    className="cursor-pointer group transition-colors hover:bg-muted/40"
                    onClick={() => onView(cert.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[180px]">
                          {cert.common_name || cert.domain_fqdn || "SSL Certificate"}
                        </span>
                        <SslWarningBadges
                          isSelfSigned={!!cert.is_self_signed}
                          hostnameMismatch={!!cert.hostname_mismatch}
                          isExpired={isExpired}
                          compact
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {typeLabel ? (
                        <span className="inline-flex items-center rounded-md border border-border/50 bg-accent/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                          {typeLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cert.issuer ? (
                        <span className="text-sm text-muted-foreground truncate max-w-[160px] block">
                          {cert.issuer}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/domains?search=${encodeURIComponent(cert.domain_fqdn)}`}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary truncate max-w-[160px] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="size-3 shrink-0" />
                        <span className="truncate">{cert.domain_fqdn}</span>
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {cert.valid_to ? formatDate(cert.valid_to) : "—"}
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
                      {cert.asset_name ? (
                        <a
                          href={`/projects/${cert.asset_id}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary truncate max-w-[140px] transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          <span className="truncate">{cert.asset_name}</span>
                        </a>
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
                                setDeleteId(cert.id)
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
            <AlertDialogTitle>Delete SSL Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the certificate for{" "}
              <strong>{deleteCert?.common_name || deleteCert?.domain_fqdn}</strong>?
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
