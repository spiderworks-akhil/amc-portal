"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpDown, User, Mail, Shield, Calendar, Clock, CheckCircle2, XCircle, Phone, Pencil } from "lucide-react"
import type { UserListItem } from "@/types/api"
import { formatDate } from "@/lib/format-utils"

export type UserSortField = "name" | "email" | "role" | "created_at" | "last_login_at"

interface UserTableProps {
  data: UserListItem[]
  isLoading: boolean
  sortField: UserSortField
  sortOrder: "asc" | "desc"
  onSort: (field: UserSortField) => void
  onEdit: (user: UserListItem) => void
}

function SortHeader({
  label,
  field,
  currentField,
  order,
  onSort,
}: {
  label: string
  field: UserSortField
  currentField: UserSortField
  order: "asc" | "desc"
  onSort: (field: UserSortField) => void
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

const roleColors: Record<string, "blue" | "purple" | "green" | "gray"> = {
  admin: "purple",
  manager: "blue",
  staff: "green",
  viewer: "gray",
}

export function UserTable({ data, isLoading, sortField, sortOrder, onSort, onEdit }: UserTableProps) {
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <SortHeader label="Name" field="name" currentField={sortField} order={sortOrder} onSort={onSort} />
            <SortHeader label="Email" field="email" currentField={sortField} order={sortOrder} onSort={onSort} />
            <TableHead>Phone</TableHead>
            <SortHeader label="Role" field="role" currentField={sortField} order={sortOrder} onSort={onSort} />
            <TableHead>Status</TableHead>
            <SortHeader label="Last Login" field="last_login_at" currentField={sortField} order={sortOrder} onSort={onSort} />
            <SortHeader label="Created" field="created_at" currentField={sortField} order={sortOrder} onSort={onSort} />
            <TableHead className="w-12" />
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
                No users found
              </TableCell>
            </TableRow>
          ) : (
            data.map((user) => (
              <TableRow
                key={user.id}
                className="group/row transition-colors hover:bg-muted/40"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="size-4" />
                    </div>
                    <span className="font-medium truncate max-w-[200px]">
                      {user.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate max-w-[220px]">
                      {user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {user.phone || <span className="text-muted-foreground/40 italic">Not set</span>}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Shield className="size-3.5 shrink-0 text-muted-foreground" />
                    <Badge
                      variant="dot"
                      size="sm"
                      color={roleColors[user.role] ?? "gray"}
                      className="capitalize"
                    >
                      {user.role}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {user.is_active ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="size-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Inactive</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {user.last_login_at ? (
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-sm">{formatDate(user.last_login_at)}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{formatDate(user.created_at)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => onEdit(user)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover/row:opacity-100"
                    title="Edit user"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
