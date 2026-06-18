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
import Link from "next/link"
import {
  ArrowUpDown,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Activity,
} from "lucide-react"
import type { MonitorListItem, MonitorCheckType, MonitorCurrentStatus } from "@/types/api"

const STATUS_CONFIG: Record<MonitorCurrentStatus, { color: "emerald" | "red" | "gray"; label: string }> = {
  up: { color: "emerald", label: "Up" },
  down: { color: "red", label: "Down" },
  unknown: { color: "gray", label: "Unknown" },
}

const TYPE_ICONS: Record<MonitorCheckType, string> = {
  http: "HTTP",
  https: "HTTPS",
  tcp: "TCP",
  ping: "Ping",
  keyword: "KW",
}

export type SortField = "name" | "current_status" | "check_type" | "last_checked_at" | "created_at"

interface MonitorTableProps {
  data: MonitorListItem[]
  isLoading: boolean
  sortField: SortField
  sortOrder: "asc" | "desc"
  onSort: (field: SortField) => void
  onEdit: (monitor: MonitorListItem) => void
  onDelete: (id: string) => void
  onTriggerCheck: (id: string) => void
}

function SortHeader({
  label,
  field,
  currentField,
  order,
  onSort,
}: {
  label: string
  field: SortField
  currentField: SortField
  order: "asc" | "desc"
  onSort: (field: SortField) => void
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

export function MonitorTable({
  data,
  isLoading,
  sortField,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onTriggerCheck,
}: MonitorTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteMonitor = data.find((m) => m.id === deleteId)

  return (
    <>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <SortHeader label="Name" field="name" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Type</TableHead>
              <SortHeader label="Status" field="current_status" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Target</TableHead>
              <TableHead>Asset</TableHead>
              <SortHeader label="Last Checked" field="last_checked_at" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Interval</TableHead>
              <TableHead>Enabled</TableHead>
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
                  No monitors found
                </TableCell>
              </TableRow>
            ) : (
              data.map((monitor) => {
                const statusCfg = STATUS_CONFIG[monitor.current_status]
                return (
                  <TableRow
                    key={monitor.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <Link
                        href={`/monitors/${monitor.id}`}
                        className="flex items-center gap-2 group/link"
                      >
                        <div className="size-7 rounded-md bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                          <Activity className="size-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="font-medium truncate max-w-[180px] group-hover/link:text-primary transition-colors">{monitor.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md border border-border/60 bg-accent/50 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                        {TYPE_ICONS[monitor.check_type]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="dot" size="sm" color={statusCfg.color}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground truncate max-w-[160px] block">
                        {monitor.target}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
                        {monitor.asset_name || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {monitor.last_checked_at
                          ? new Date(monitor.last_checked_at).toLocaleString()
                          : "Never"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {monitor.interval_seconds >= 3600
                          ? `${monitor.interval_seconds / 3600}h`
                          : monitor.interval_seconds >= 60
                            ? `${monitor.interval_seconds / 60}m`
                            : `${monitor.interval_seconds}s`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {monitor.enabled ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Yes</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
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
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTriggerCheck(monitor.id) }}>
                              <Play className="size-3.5 mr-2" />
                              Run Check
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(monitor) }}>
                              <Pencil className="size-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteId(monitor.id)
                              }}
                            >
                              <Trash2 className="size-3.5" />
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Monitor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteMonitor?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) onDelete(deleteId)
                setDeleteId(null)
              }}
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
