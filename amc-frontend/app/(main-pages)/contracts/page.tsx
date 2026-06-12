"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useContracts } from "@/hooks/use-contracts"
import { useDebounce } from "@/hooks/use-debounce"
import { formatDate, formatCurrency } from "@/lib/format-utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/r-select"
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
  Search,
  FileText,
  Building2,
  DollarSign,
  CalendarClock,
  RefreshCw,
  AlertTriangle,
  Filter,
} from "lucide-react"

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
  { value: "draft", label: "Draft" },
  { value: "terminated", label: "Terminated" },
]

const CONTRACT_STATUS_COLORS: Record<string, "emerald" | "amber" | "red" | "blue" | "gray"> = {
  active: "emerald",
  expiring: "amber",
  expired: "red",
  draft: "blue",
  terminated: "gray",
}

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
}

function ContractCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full shrink-0" />
      </div>
      <div className="space-y-2.5 border-t border-border/40 pt-3.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  )
}

export default function ContractsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const statusFilter = searchParams.get("status") || "all"
  const limit = 30

  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 300)

  // Sync URL search param back to local state
  useEffect(() => {
    if (search !== inputValue && search !== debouncedSearch) {
      setInputValue(search)
    }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync debounced value to URL
  useEffect(() => {
    if (debouncedSearch !== search) {
      const params = new URLSearchParams(searchParams.toString())
      if (debouncedSearch) {
        params.set("search", debouncedSearch)
      } else {
        params.delete("search")
      }
      params.set("page", "1")
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [debouncedSearch, search, searchParams, router, pathname])

  const { data, isLoading } = useContracts({
    page,
    search,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit,
    sort_by: "end_date",
    sort_order: "asc",
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

  const handleSearchChange = useCallback((value: string) => {
    setInputValue(value)
  }, [])

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: String(newPage) })
    },
    [updateParams]
  )

  const handleContractClick = useCallback(
    (id: string) => {
      router.push(`/contracts/${id}`)
    },
    [router]
  )

  const totalPages = data?.meta.totalPages ?? 0
  const total = data?.meta.total ?? 0
  const contracts = data?.data ?? []

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
            <p className="text-muted-foreground mt-1">
              Manage AMC contracts, track renewals, and monitor contract value
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts by number, client, or scope..."
              value={inputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-44">
            <Select
              value={statusFilter}
              onValueChange={(value) => updateParams({ status: value === "all" ? undefined : value })}
            >
              <SelectTrigger size="sm" className="min-h-9 h-9">
                <Filter className="size-3.5 mr-1.5 shrink-0" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results summary */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            Showing {contracts.length} of {total} contracts
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ContractCardSkeleton key={i} />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="size-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No contracts found</p>
            <p className="text-sm mt-1 max-w-md mx-auto">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Contracts will appear here once they are created and linked to assets."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map((contract) => {
              const endDate = new Date(contract.end_date)
              const now = new Date()
              const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              const isExpired = daysUntilEnd <= 0
              const isExpiringSoon = daysUntilEnd > 0 && daysUntilEnd <= 30

              return (
                <div
                  key={contract.id}
                  className="rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-sm group cursor-pointer"
                  onClick={() => handleContractClick(contract.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleContractClick(contract.id)
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {contract.contract_number || `Contract ${contract.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="size-3 shrink-0" />
                        <span className="truncate">{contract.client_name}</span>
                      </p>
                    </div>
                    <Badge
                      variant="dot"
                      size="sm"
                      color={CONTRACT_STATUS_COLORS[contract.status] ?? "gray"}
                      className="shrink-0"
                    >
                      {contract.status}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3.5">
                    <div className="flex items-center gap-2">
                      <DollarSign className="size-3 shrink-0" />
                      <span className="font-medium text-foreground">
                        {formatCurrency(contract.amount, contract.currency)}
                      </span>
                      <span className="text-muted-foreground/50">/</span>
                      <span className="capitalize">
                        {BILLING_CYCLE_LABELS[contract.billing_cycle] || contract.billing_cycle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CalendarClock className="size-3 shrink-0" />
                      <span>Ends {formatDate(contract.end_date)}</span>
                      {isExpired && (
                        <span className="flex items-center gap-0.5 text-destructive font-medium">
                          <AlertTriangle className="size-3" />
                          Expired
                        </span>
                      )}
                      {isExpiringSoon && !isExpired && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          ({daysUntilEnd}d)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="size-3 shrink-0" />
                        {contract.auto_renew ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Auto-renew</span>
                        ) : (
                          <span>Manual renew</span>
                        )}
                      </span>
                      <span>{contract.asset_count} asset{contract.asset_count !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

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
  )
}
