"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useServers } from "@/hooks/use-servers"
import { useProviders } from "@/hooks/use-providers"
import { useDebounce } from "@/hooks/use-debounce"
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
import { formatDate, formatCurrency } from "@/lib/format-utils"
import {
  Search,
  Server,
  Globe,
  MapPin,
  DollarSign,
  CalendarClock,
  Building2,
  HardDrive,
  Filter,
} from "lucide-react"

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  cloud: "Cloud",
  registrar: "Registrar",
  cdn: "CDN",
  email: "Email",
  other: "Other",
}

function ServerCardSkeleton() {
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

export default function ServersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const providerFilter = searchParams.get("provider_id") || "all"
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

  const { data, isLoading } = useServers({
    page,
    search,
    provider_id: providerFilter !== "all" ? providerFilter : undefined,
    limit,
    sort_by: "label",
    sort_order: "asc",
  })

  const { data: providersData } = useProviders()

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

  const handleServerClick = useCallback(
    (id: string) => {
      router.push(`/servers/${id}`)
    },
    [router]
  )

  const totalPages = data?.meta.totalPages ?? 0
  const total = data?.meta.total ?? 0
  const servers = data?.data ?? []
  const providers = providersData?.data ?? []

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Servers</h1>
            <p className="text-muted-foreground mt-1">
              Manage hosting servers, their providers, and renewal dates
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search servers by label, region, or provider..."
              value={inputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-48">
            <Select
              value={providerFilter}
              onValueChange={(value) => updateParams({ provider_id: value === "all" ? undefined : value })}
            >
              <SelectTrigger size="sm" className="min-h-9 h-9">
                <Filter className="size-3.5 mr-1.5 shrink-0" />
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results summary */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            Showing {servers.length} of {total} servers
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ServerCardSkeleton key={i} />
            ))}
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Server className="size-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No servers found</p>
            <p className="text-sm mt-1 max-w-md mx-auto">
              {search || providerFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Servers will appear here once they are created and linked to assets."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map((server) => {
              const renewalDate = server.renewal_date ? new Date(server.renewal_date) : null
              const now = new Date()
              const daysUntilRenewal = renewalDate
                ? Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null
              const isExpired = daysUntilRenewal !== null && daysUntilRenewal <= 0
              const isExpiringSoon = daysUntilRenewal !== null && daysUntilRenewal > 0 && daysUntilRenewal <= 30

              return (
                <div
                  key={server.id}
                  className="rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-sm group cursor-pointer"
                  onClick={() => handleServerClick(server.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleServerClick(server.id)
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <Server className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{server.label}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="size-3 shrink-0" />
                        <span className="truncate">{server.provider_name}</span>
                        <span className="inline-flex items-center rounded-full border border-border/50 bg-accent/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground capitalize">
                          {PROVIDER_TYPE_LABELS[server.provider_type] || server.provider_type}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3.5">
                    {server.ip_addresses && server.ip_addresses.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Globe className="size-3 shrink-0" />
                        <span className="font-mono truncate">{server.ip_addresses[0]}</span>
                        {server.ip_addresses.length > 1 && (
                          <span className="text-[10px] text-muted-foreground/60">
                            +{server.ip_addresses.length - 1}
                          </span>
                        )}
                      </div>
                    )}

                    {server.region && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3 shrink-0" />
                        <span>{server.region}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <DollarSign className="size-3 shrink-0" />
                      <span>{formatCurrency(server.monthly_cost, server.currency)}</span>
                      <span className="text-muted-foreground/50">/mo</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="size-3 shrink-0" />
                        <span>Renewal: {formatDate(server.renewal_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="size-3 shrink-0" />
                        <span>{server.asset_count} assets</span>
                      </div>
                    </div>

                    {isExpired && (
                      <div className="flex items-center gap-1.5 text-destructive font-medium pt-0.5">
                        <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                        Renewal overdue
                      </div>
                    )}
                    {isExpiringSoon && !isExpired && (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                        <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                        Expiring in {daysUntilRenewal}d
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
