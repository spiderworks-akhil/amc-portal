"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { UserTable, type UserSortField } from "@/components/users/user-table"
import { useUsers } from "@/hooks/use-users"
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
import { Search } from "lucide-react"

export function UsersPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const sortFieldParam = searchParams.get("sort_by") || "name"
  const sortOrderParam = searchParams.get("sort_order") || "asc"
  const limit = 30

  const [inputValue, setInputValue] = useState(search)
  const [sortField, setSortField] = useState<UserSortField>(sortFieldParam as UserSortField)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(sortOrderParam as "asc" | "desc")
  const debouncedSearch = useDebounce(inputValue, 300)

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

  const { data, isLoading } = useUsers({
    page,
    search,
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

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: String(newPage) })
    },
    [updateParams]
  )

  const handleSort = useCallback(
    (field: UserSortField) => {
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

  const totalPages = data?.meta.totalPages ?? 0

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="mt-1 text-muted-foreground">
              View all registered users and their account details
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={inputValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <UserTable
          data={data?.data || []}
          isLoading={isLoading}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
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
