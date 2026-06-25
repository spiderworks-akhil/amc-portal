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
  Globe,
} from "lucide-react"
import type { AssetListItem } from "@/types/api"

const STATUS_COLORS: Record<string, "emerald" | "amber" | "blue" | "gray"> = {
  live: "emerald",
  staging: "amber",
  development: "blue",
  parked: "gray",
}

const STATUS_LABELS: Record<string, string> = {
  live: "Live",
  staging: "Staging",
  development: "Dev",
  parked: "Parked",
}

export type SortField = "name" | "status" | "type_name" | "client_name" | "created_at" | "updated_at"

interface AssetTableProps {
  data: AssetListItem[]
  isLoading: boolean
  sortField: SortField
  sortOrder: "asc" | "desc"
  onSort: (field: SortField) => void
  onEdit: (asset: AssetListItem) => void
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

export function AssetTable({
  data,
  isLoading,
  sortField,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onView,
}: AssetTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteAsset = data.find((a) => a.id === deleteId)

  return (
    <>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <SortHeader label="Name" field="name" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Type</TableHead>
              <SortHeader label="Status" field="status" currentField={sortField} order={sortOrder} onSort={onSort} />
              <SortHeader label="Client" field="client_name" currentField={sortField} order={sortOrder} onSort={onSort} />
              <TableHead>Contact</TableHead>
              <SortHeader label="Created" field="created_at" currentField={sortField} order={sortOrder} onSort={onSort} />
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
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              data.map((asset) => (
                <TableRow
                  key={asset.id}
                  className="cursor-pointer group transition-colors hover:bg-muted/40"
                  onClick={() => onView(asset.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium truncate max-w-[180px]">{asset.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-xs">{asset.type_name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="dot"
                      size="sm"
                      color={STATUS_COLORS[asset.status] ?? "gray"}
                    >
                      {STATUS_LABELS[asset.status] ?? asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{asset.client_name}</span>
                  </TableCell>
                  <TableCell>
                    {asset.primary_contact_name ? (
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                        {asset.primary_contact_name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {new Date(asset.created_at).toLocaleDateString()}
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
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(asset) }}>
                            <Pencil className="size-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteId(asset.id)
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteAsset?.name}</strong>? This action cannot be undone.
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
