"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useSslCertificates } from "@/hooks/use-ssl"
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
  ShieldCheck,
  Globe,
  Building2,
  CalendarClock,
  Clock,
  Filter,
} from "lucide-react"

const SSL_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "dv", label: "DV" },
  { value: "ov", label: "OV" },
  { value: "ev", label: "EV" },
  { value: "wildcard", label: "Wildcard" },
]

const SSL_TYPE_LABELS: Record<string, string> = {
  dv: "DV",
  ov: "OV",
  ev: "EV",
  wildcard: "Wildcard",
}

function SslCardSkeleton() {
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

export default function SslCertificatesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const typeFilter = searchParams.get("type") || "all"
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

  const { data, isLoading } = useSslCertificates({
    page,
    search,
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit,
    sort_by: "valid_to",
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

  const handleSslClick = useCallback(
    (id: string) => {
      router.push(`/ssl-certificates/${id}`)
    },
    [router]
  )

  const totalPages = data?.meta.totalPages ?? 0
  const total = data?.meta.total ?? 0
  const certs = data?.data ?? []

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SSL Certificates</h1>
            <p className="text-muted-foreground mt-1">
              Monitor SSL/TLS certificate expiry dates across all domains
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search certificates by common name, issuer, or domain..."
              value={inputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-44">
            <Select
              value={typeFilter}
              onValueChange={(value) => updateParams({ type: value === "all" ? undefined : value })}
            >
              <SelectTrigger size="sm" className="min-h-9 h-9">
                <Filter className="size-3.5 mr-1.5 shrink-0" />
                <SelectValue placeholder="Certificate type" />
              </SelectTrigger>
              <SelectContent>
                {SSL_TYPE_OPTIONS.map((opt) => (
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
            Showing {certs.length} of {total} certificates
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SslCardSkeleton key={i} />
            ))}
          </div>
        ) : certs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ShieldCheck className="size-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No SSL certificates found</p>
            <p className="text-sm mt-1 max-w-md mx-auto">
              {search || typeFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "SSL certificates will appear here once they are added to domains."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certs.map((cert) => {
              const isExpired = cert.days_to_expiry !== null && cert.days_to_expiry <= 0
              const isExpiringSoon = cert.days_to_expiry !== null && cert.days_to_expiry > 0 && cert.days_to_expiry <= 30

              return (
                <div
                  key={cert.id}
                  className="rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-sm group cursor-pointer"
                  onClick={() => handleSslClick(cert.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleSslClick(cert.id)
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          {cert.common_name || cert.domain_fqdn || "SSL Certificate"}
                        </p>
                        {cert.type && (
                          <span className="inline-flex items-center rounded-md border border-border/50 bg-accent/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground uppercase shrink-0">
                            {SSL_TYPE_LABELS[cert.type] || cert.type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Globe className="size-3 shrink-0" />
                        <span className="truncate">{cert.domain_fqdn}</span>
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="size-3 shrink-0" />
                        <span>
                          {cert.valid_to
                            ? `Expires ${formatDate(cert.valid_to)}`
                            : "No expiry date"}
                        </span>
                      </div>
                      {cert.days_to_expiry !== null && (
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
                            : `${cert.days_to_expiry}d`}
                        </span>
                      )}
                    </div>

                    {cert.issuer && (
                      <div className="flex items-center gap-2">
                        <Building2 className="size-3 shrink-0" />
                        <span>{cert.issuer}</span>
                      </div>
                    )}

                    {cert.asset_name && (
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-3 shrink-0" />
                        <span className="truncate">{cert.asset_name}</span>
                      </div>
                    )}

                    {cert.valid_from && (
                      <div className="flex items-center gap-2">
                        <CalendarClock className="size-3 shrink-0" />
                        <span>Issued {formatDate(cert.valid_from)}</span>
                      </div>
                    )}

                    {cert.sans && cert.sans.length > 0 && (
                      <div className="flex items-center gap-2 pt-0.5 text-muted-foreground/60">
                        <span className="text-[10px] uppercase tracking-wider">SANs:</span>
                        <span className="truncate">{cert.sans.length} subject{cert.sans.length !== 1 ? "s" : ""}</span>
                      </div>
                    )}

                    {cert.last_checked_at && (
                      <div className="flex items-center gap-2 pt-0.5 text-muted-foreground/60">
                        <Clock className="size-3 shrink-0" />
                        <span>Checked {formatDate(cert.last_checked_at)}</span>
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
