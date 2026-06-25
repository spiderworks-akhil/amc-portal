"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { SslTable, type SslSortField } from "@/components/ssl-certificates/ssl-table"
import { useSslCertificates, useDeleteSsl } from "@/hooks/use-ssl"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/use-debounce"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { SmoothSelect } from "@/components/ui/smooth-select"
import { Search } from "lucide-react"
import { SSL_TYPE_OPTIONS } from "./constants"

export function SslPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const typeFilter = searchParams.get("type") || "all"
  const sortFieldParam = searchParams.get("sort_by") || "valid_to"
  const sortOrderParam = searchParams.get("sort_order") || "asc"
  const limit = 30

  const [inputValue, setInputValue] = useState(search)
  const [sortField, setSortField] = useState<SslSortField>(sortFieldParam as SslSortField)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(sortOrderParam as "asc" | "desc")
  const debouncedSearch = useDebounce(inputValue, 300)

  const deleteSsl = useDeleteSsl()

  useEffect(() => {
    if (search !== inputValue && search !== debouncedSearch) {
      setInputValue(search)
    }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debouncedSearch !== search) {
      const params = new URLSearchParams(searchParams.toString())
      if (debouncedSearch) {
        params.set("search", debouncedSearch)
        params.set("page", "1")
      } else {
        params.delete("search")
        params.set("page", "1")
      }
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [debouncedSearch, search, searchParams, router, pathname])

  const { data, isLoading } = useSslCertificates({
    page,
    search,
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit,
    sort_by: sortField,
    sort_order: sortOrder,
  })

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const handleSearchChange = useCallback((value: string) => {
    setInputValue(value)
  }, [])

  const handleTypeChange = useCallback(
    (value: string) => {
      updateParams({
        type: value === "all" ? undefined : value,
        page: "1",
      })
    },
    [updateParams]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: String(newPage) })
    },
    [updateParams]
  )

  const handleSort = useCallback(
    (field: SslSortField) => {
      setSortField((prev) => {
        if (prev === field) {
          const newOrder = sortOrder === "asc" ? "desc" : "asc"
          setSortOrder(newOrder)
          updateParams({ sort_by: field, sort_order: newOrder })
          return field
        }
        setSortOrder("asc")
        updateParams({ sort_by: field, sort_order: "asc" })
        return field
      })
    },
    [sortOrder, updateParams]
  )

  const handleSslClick = useCallback(
    (id: string) => {
      router.push(`/ssl-certificates/${id}`)
    },
    [router]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteSsl.mutate(id)
    },
    [deleteSsl]
  )

  const totalPages = data?.meta.totalPages ?? 0

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              SSL Certificates
            </h1>
            <p className="mt-1 text-muted-foreground">
              Monitor SSL/TLS certificate expiry dates across all domains
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="Search by common name, issuer, or domain..."
                value={inputValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-full sm:w-44">
            <SmoothSelect
              options={SSL_TYPE_OPTIONS as unknown as { value: string; label: string }[]}
              value={typeFilter}
              onChange={handleTypeChange}
              className="[&>button]:min-h-9 [&>button]:h-9 [&>button]:text-xs"
            />
          </div>
        </div>

        <SslTable
          data={data?.data || []}
          isLoading={isLoading}
          sortField={sortField}
          sortOrder={sortOrder}
          isDeleting={deleteSsl.isPending}
          onSort={handleSort}
          onDelete={handleDelete}
          onView={handleSslClick}
        />

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
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  )
}
