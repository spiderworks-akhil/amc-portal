"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDomains } from "@/hooks/use-domains"
import { useDebounce } from "@/hooks/use-debounce"
import { formatDate } from "@/lib/format-utils"
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
  Globe,
  Building2,
  CalendarClock,
  RefreshCw,
  ShieldCheck,
  Filter,
  Clock,
} from "lucide-react"

const AUTO_RENEW_OPTIONS = [
  { value: "all", label: "All" },
  { value: "true", label: "Auto-renew" },
  { value: "false", label: "Manual renew" },
]

function DomainCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 animate-pulse">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="space-y-2.5 border-t border-border/40 pt-3.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  )
}

export default function DomainsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const autoRenewFilter = searchParams.get("auto_renew") || "all"
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

  const { data, isLoading } = useDomains({
    page,
    search,
    auto_renew: autoRenewFilter !== "all" ? autoRenewFilter === "true" : undefined,
    limit,
    sort_by: "expiry_date",
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

  const totalPages = data?.meta.totalPages ?? 0
  const total = data?.meta.total ?? 0
  const domains = data?.data ?? []

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Domains</h1>
            <p className="text-muted-foreground mt-1">
              Track domain registrations, expiry dates, and SSL certificates
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search domains by name or asset..."
              value={inputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-44">
            <Select
              value={autoRenewFilter}
              onValueChange={(value) => updateParams({ auto_renew: value === "all" ? undefined : value })}
            >
              <SelectTrigger size="sm" className="min-h-9 h-9">
                <RefreshCw className="size-3.5 mr-1.5 shrink-0" />
                <SelectValue placeholder="Renewal" />
              </SelectTrigger>
              <SelectContent>
                {AUTO_RENEW_OPTIONS.map((opt) => (
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
            Showing {domains.length} of {total} domains
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <DomainCardSkeleton key={i} />
            ))}
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Globe className="size-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No domains found</p>
            <p className="text-sm mt-1 max-w-md mx-auto">
              {search || autoRenewFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Domains will appear here once they are added to assets."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((domain) => {
              const isExpired = domain.days_to_expiry !== null && domain.days_to_expiry <= 0
              const isExpiringSoon = domain.days_to_expiry !== null && domain.days_to_expiry > 0 && domain.days_to_expiry <= 30

              return (
                <div
                  key={domain.id}
                  className="rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-sm group cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/domains/${domain.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") router.push(`/domains/${domain.id}`)
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <Globe className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{domain.fqdn}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="size-3 shrink-0" />
                        <span className="truncate">{domain.asset_name}</span>
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="size-3 shrink-0" />
                        <span>
                          {domain.expiry_date
                            ? `Expires ${formatDate(domain.expiry_date)}`
                            : "No expiry date"}
                        </span>
                      </div>
                      {domain.days_to_expiry !== null && (
                        <span
                          className={`font-medium ${
                            isExpired
                              ? "text-destructive"
                              : isExpiringSoon
                                ? "text-amber-600 dark:text-amber-400"
                                : ""
                          }`}
                        >
                          {isExpired
                            ? "Expired"
                            : `${domain.days_to_expiry}d`}
                        </span>
                      )}
                    </div>

                    {domain.registrar_name && (
                      <div className="flex items-center gap-2">
                        <Building2 className="size-3 shrink-0" />
                        <span>{domain.registrar_name}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="size-3 shrink-0" />
                        {domain.auto_renew ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Auto-renew</span>
                        ) : (
                          <span>Manual renew</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="size-3 shrink-0" />
                        <span>{domain.ssl_count} SSL</span>
                      </span>
                    </div>

                    {domain.last_checked_at && (
                      <div className="flex items-center gap-2 pt-0.5 text-muted-foreground/60">
                        <Clock className="size-3 shrink-0" />
                        <span>Checked {formatDate(domain.last_checked_at)}</span>
                      </div>
                    )}
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
