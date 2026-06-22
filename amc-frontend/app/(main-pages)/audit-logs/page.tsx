"use client"

import { Suspense, useCallback, useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuditLogs } from "@/hooks/use-audit-logs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SmoothSelect } from "@/components/ui/smooth-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  User,
  Eye,
  FileText,
  Shield,
  Globe,
  HardDrive,
  Server,
  Activity,
  AlertTriangle,
  UserPlus,
  Edit,
  Trash2,
  LogIn,
  Archive,
  RotateCcw,
} from "lucide-react"
import Loading from "@/components/common/loader"

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All Entities" },
  { value: "client", label: "Clients" },
  { value: "asset", label: "Assets" },
  { value: "contract", label: "Contracts" },
  { value: "domain", label: "Domains" },
  { value: "ssl", label: "SSL Certificates" },
  { value: "server", label: "Servers" },
  { value: "provider", label: "Providers" },
  { value: "monitor", label: "Monitors" },
  { value: "incident", label: "Incidents" },
  { value: "user", label: "Users" },
]

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
]

const ACTION_CONFIG: Record<string, { icon: typeof Eye; color: string }> = {
  create: { icon: UserPlus, color: "text-emerald-600 dark:text-emerald-400" },
  update: { icon: Edit, color: "text-blue-600 dark:text-blue-400" },
  delete: { icon: Trash2, color: "text-red-600 dark:text-red-400" },
  login: { icon: LogIn, color: "text-emerald-600 dark:text-emerald-400" },
  logout: { icon: LogIn, color: "text-muted-foreground" },
  archive: { icon: Archive, color: "text-amber-600 dark:text-amber-400" },
  restore: { icon: RotateCcw, color: "text-blue-600 dark:text-blue-400" },
}

const ENTITY_TYPE_ICONS: Record<string, typeof FileText> = {
  client: User,
  asset: HardDrive,
  contract: FileText,
  domain: Globe,
  ssl: Shield,
  server: Server,
  monitor: Activity,
  incident: AlertTriangle,
  provider: Server,
  user: User,
}

export default function AuditLogsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const entityTypeFilter = searchParams.get("entity_type") || "all"
  const actionFilter = searchParams.get("action") || "all"
  const limit = 50

  const { data, isLoading } = useAuditLogs({
    page,
    limit,
    entity_type: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
    action: actionFilter !== "all" ? actionFilter : undefined,
  })

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })
      if (!updates.page) params.set("page", "1")
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: String(newPage) })
    },
    [updateParams]
  )

  const totalPages = data?.meta.totalPages ?? 0
  const total = data?.meta.total ?? 0

  return (
    <Suspense fallback={<Loading />}>
    <div className="container mx-auto max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track all changes and actions across the system
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="w-44">
            <SmoothSelect
              options={ENTITY_TYPE_OPTIONS}
              value={entityTypeFilter}
              onChange={(value) => updateParams({ entity_type: value === "all" ? undefined : value })}
              className="[&>button]:min-h-9 [&>button]:h-9 [&>button]:text-xs"
            />
          </div>
          <div className="w-40">
            <SmoothSelect
              options={ACTION_OPTIONS}
              value={actionFilter}
              onChange={(value) => updateParams({ action: value === "all" ? undefined : value })}
              className="[&>button]:min-h-9 [&>button]:h-9 [&>button]:text-xs"
            />
          </div>
        </div>

        {/* Results summary */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            Showing {data?.data.length ?? 0} of {total} audit log entries
          </p>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="w-12 text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No audit log entries found
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((log) => {
                  const actionCfg = ACTION_CONFIG[log.action] ?? { icon: Eye, color: "text-muted-foreground" }
                  const ActionIcon = actionCfg.icon
                  const EntityIcon = ENTITY_TYPE_ICONS[log.entity_type] ?? FileText
                  return (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer group transition-colors hover:bg-muted/40"
                      onClick={() => router.push(`/audit-logs/${log.id}`)}
                    >
                      <TableCell>
                        <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${actionCfg.color}`}>
                          <ActionIcon className="size-3.5" />
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EntityIcon className="size-3.5 text-muted-foreground shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium capitalize">{log.entity_type}</span>
                            <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                              {log.entity_id}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {log.actor_name ?? "System"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {log.ip ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); router.push(`/audit-logs/${log.id}`) }}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page > 1) handlePageChange(page - 1)
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(pageNum)
                      }}
                      isActive={page === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              {totalPages > 5 && page < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page < totalPages) handlePageChange(page + 1)
                  }}
                  className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
    </Suspense>
  )
}
