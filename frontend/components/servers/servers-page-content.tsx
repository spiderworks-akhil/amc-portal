"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { ServerTable, type ServerSortField } from "@/components/servers/server-table"
import { useServers, useCreateServer, useDeleteServer } from "@/hooks/use-servers"
import { useProviders } from "@/hooks/use-providers"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import { Plus, Search } from "lucide-react"
import { SmoothSelect } from "../ui/smooth-select"
import { ServerCreateDrawer } from "./server-create-drawer"

export function ServersPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const providerFilter = searchParams.get("provider_id") || "all"
  const ownerFilter = searchParams.get("owner") || "all"
  const sortFieldParam = searchParams.get("sort_by") || "label"
  const sortOrderParam = searchParams.get("sort_order") || "asc"
  const limit = 30

  const [inputValue, setInputValue] = useState(search)
  const [sortField, setSortField] = useState<ServerSortField>(sortFieldParam as ServerSortField)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(sortOrderParam as "asc" | "desc")
  const debouncedSearch = useDebounce(inputValue, 300)

  const createServer = useCreateServer()
  const deleteServer = useDeleteServer()

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

  const { data, isLoading } = useServers({
    page,
    search,
    provider_id: providerFilter !== "all" ? providerFilter : undefined,
    owner: ownerFilter !== "all" ? ownerFilter : undefined,
    limit,
    sort_by: sortField,
    sort_order: sortOrder,
  })

  const { data: providersData } = useProviders()

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

  const handleProviderChange = useCallback(
    (value: string) => {
      updateParams({
        provider_id: value === "all" ? undefined : value,
        page: "1",
      })
    },
    [updateParams]
  )

  const handleOwnerChange = useCallback(
    (value: string) => {
      updateParams({
        owner: value === "all" ? undefined : value,
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
    (field: ServerSortField) => {
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

  const handleServerClick = useCallback(
    (id: string) => {
      router.push(`/servers/${id}`)
    },
    [router]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteServer.mutate(id)
    },
    [deleteServer]
  )

  const [createOpen, setCreateOpen] = useState(false)

  const handleCreateSubmit = useCallback(
    (data: Parameters<typeof createServer.mutate>[0]) => {
      createServer.mutate(data, {
        onSuccess: () => setCreateOpen(false),
      })
    },
    [createServer]
  )

  const totalPages = data?.meta.totalPages ?? 0

  return (
    <>
    <ServerCreateDrawer
      open={createOpen}
      onOpenChange={setCreateOpen}
      onSubmit={handleCreateSubmit}
      isPending={createServer.isPending}
      providers={providersData?.data ?? []}
    />
    <div className="container mx-auto max-w-7xl px-4 py-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Servers</h1>
            <p className="mt-1 text-muted-foreground">
              Manage hosting servers, providers, and renewal dates
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            Add Server
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="Search servers by label, region, or provider..."
                value={inputValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-full sm:w-40">
            <SmoothSelect
              options={[
                { value: "all", label: "All Owners" },
                { value: "SpiderWorks", label: "SpiderWorks" },
                { value: "client", label: "Client" },
                { value: "thirdparty", label: "Third Party" },
              ]}
              value={ownerFilter}
              onChange={handleOwnerChange}
              className="[&>button]:min-h-9 [&>button]:h-9 [&>button]:text-xs"
            />
          </div>
          <div className="w-full sm:w-48">
            <SmoothSelect
              options={[{ value: "all", label: "All Providers" }, ...(providersData?.data?.map((p) => ({ value: p.id, label: p.name })) || [])]}
              value={providerFilter}
              onChange={handleProviderChange}
              className="[&>button]:min-h-9 [&>button]:h-9 [&>button]:text-xs"
            />
          </div>
        </div>

        <ServerTable
          data={data?.data || []}
          isLoading={isLoading}
          sortField={sortField}
          sortOrder={sortOrder}
          isDeleting={deleteServer.isPending}
          onSort={handleSort}
          onDelete={handleDelete}
          onView={handleServerClick}
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
    </>
  )
}
