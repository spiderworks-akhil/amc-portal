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
  Pencil,
  Trash2,
  ToggleLeft,
} from "lucide-react"
import type { ReminderRuleListItem } from "@/types/api"
import { formatDate } from "@/lib/format-utils"

const EVENT_TYPE_LABELS: Record<string, string> = {
  domain_expiry: "Domain Expiry",
  ssl_expiry: "SSL Expiry",
  contract_expiry: "Contract Expiry",
  server_expiry: "Server Expiry",
  incident: "Incident",
}

const EVENT_TYPE_COLORS: Record<string, { dot: string; bg: string }> = {
  domain_expiry: { dot: "bg-blue-500", bg: "bg-blue-500/10" },
  ssl_expiry: { dot: "bg-emerald-500", bg: "bg-emerald-500/10" },
  contract_expiry: { dot: "bg-amber-500", bg: "bg-amber-500/10" },
  server_expiry: { dot: "bg-red-500", bg: "bg-red-500/10" },
  incident: { dot: "bg-purple-500", bg: "bg-purple-500/10" },
}

export type RuleSortField = "name" | "event_type" | "enabled" | "created_at"

interface ReminderRulesTableProps {
  data: ReminderRuleListItem[]
  isLoading: boolean
  sortField: RuleSortField
  sortOrder: "asc" | "desc"
  onSort: (field: RuleSortField) => void
  onEdit: (rule: ReminderRuleListItem) => void
  onDelete: (id: string) => void
}

function SortHeader({
  label,
  field,
  currentField,
  order,
  onSort,
}: {
  label: string
  field: RuleSortField
  currentField: RuleSortField
  order: "asc" | "desc"
  onSort: (field: RuleSortField) => void
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

export function ReminderRulesTable({
  data,
  isLoading,
  sortField,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
}: ReminderRulesTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteItem = data.find((r) => r.id === deleteId)

  return (
    <>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <SortHeader label="Name" field="name" currentField={sortField} order={sortOrder} onSort={onSort} />
              <SortHeader label="Event Type" field="event_type" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Trigger Days</TableHead>
              <TableHead>Channels</TableHead>
              <SortHeader label="Enabled" field="enabled" currentField={sortField} order={sortOrder} onSort={onSort} />
              <SortHeader label="Created" field="created_at" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No reminder rules found
                </TableCell>
              </TableRow>
            ) : (
              data.map((rule) => {
                const eventColor = EVENT_TYPE_COLORS[rule.event_type] ?? { dot: "bg-gray-500", bg: "bg-gray-500/10" }
                return (
                  <TableRow
                    key={rule.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-md bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                          <ToggleLeft className="size-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="font-medium truncate max-w-[200px]">{rule.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${eventColor.dot}`} />
                        <span className="text-xs font-medium">
                          {EVENT_TYPE_LABELS[rule.event_type] ?? rule.event_type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {rule.trigger_days.map((day) => (
                          <span
                            key={day}
                            className="inline-flex items-center rounded-md border border-border/60 bg-accent/50 px-1.5 py-0.5 text-[11px] font-mono font-medium text-muted-foreground"
                          >
                            {day}d
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {rule.channels.map((ch) => (
                          <span
                            key={ch}
                            className="inline-flex items-center rounded-md border border-border/60 bg-accent/50 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground capitalize"
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {rule.enabled ? (
                        <Badge variant="dot" size="sm" color="emerald">Active</Badge>
                      ) : (
                        <Badge variant="dot" size="sm" color="gray">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(rule.created_at)}
                      </span>
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(rule) }}>
                              <Pencil className="size-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteId(rule.id)
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
            <AlertDialogTitle>Delete Reminder Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This action cannot be undone.
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
