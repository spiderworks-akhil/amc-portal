"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AssetTable } from "./asset-table"
import { useAssets, useCreateAsset, useDeleteAsset } from "@/hooks/use-assets"
import { useClients } from "@/hooks/use-clients"
import { useDebounce } from "@/hooks/use-debounce"
import { useCreateMonitor } from "@/hooks/use-monitors"
import { SmoothSelect } from "@/components/ui/smooth-select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Search, Plus } from "lucide-react"
import type { AssetListItem } from "@/types/api"
import type { SortField } from "./asset-table"
import { AssetCreateDialog } from "./asset-create-dialog"

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "live", label: "Live" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "parked", label: "Parked" },
]

const ASSET_TYPES = [
  { value: "website", label: "Website" },
  { value: "landing_page", label: "Landing Page" },
  { value: "mobile_application", label: "Mobile Application" },
]

export function AssetsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const statusFilter = searchParams.get("status") || "all"
  const typeFilter = searchParams.get("type") || "all"
  const sortField = (searchParams.get("sort_by") || "name") as SortField
  const sortOrder = (searchParams.get("sort_order") || "asc") as "asc" | "desc"
  const limit = 50

  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 300)
  const [createOpen, setCreateOpen] = useState(false)

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

  const { data, isLoading } = useAssets({
    page,
    search,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit,
    sort_by: sortField,
    sort_order: sortOrder,
  })

  const { data: clientsData } = useClients({ limit: 100, sort_by: "name", sort_order: "asc" })
  const { mutate: createAsset, isPending: isCreating } = useCreateAsset()
  const { mutate: deleteAsset } = useDeleteAsset()
  const { mutate: createMonitor, isPending: isCreatingMonitor } = useCreateMonitor()

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })
      // Reset to page 1 when filters change
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

  const handleSort = useCallback(
    (field: SortField) => {
      const newOrder = field === sortField && sortOrder === "asc" ? "desc" : "asc"
      updateParams({ sort_by: field, sort_order: newOrder })
    },
    [sortField, sortOrder, updateParams]
  )

  const handleCreateSubmit = useCallback(
    (formData: { client_id?: string; name: string; type: string; primary_url?: string; primary_contact_name?: string; primary_contact_email?: string; notes?: string; createMonitor?: boolean }) => {
      if (!formData.client_id) return

      const { createMonitor: shouldCreateMonitor, ...assetData } = formData

      createAsset(assetData as { client_id: string; name: string; type: string; primary_url?: string; primary_contact_name?: string; primary_contact_email?: string; notes?: string }, {
        onSuccess: (result) => {
          const newAssetId = result.data.id

          if (shouldCreateMonitor && formData.primary_url) {
            createMonitor({
              asset_id: newAssetId,
              name: `Monitor: ${formData.name}`,
              check_type: "https",
              target: formData.primary_url,
              interval_seconds: 300,
              enabled: true,
            }, {
              onSuccess: () => setCreateOpen(false),
              onError: () => setCreateOpen(false), // Still close even if monitor creation fails
            })
          } else {
            setCreateOpen(false)
          }
        },
      })
    },
    [createAsset, createMonitor]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteAsset(id)
    },
    [deleteAsset]
  )

  const handleView = useCallback(
    (id: string) => {
      router.push(`/assets/${id}`)
    },
    [router]
  )

  const handleEdit = useCallback(
    (asset: AssetListItem) => {
      router.push(`/assets/${asset.id}?edit=true`)
    },
    [router]
  )

  const totalPages = data?.meta.totalPages ?? 0
  const total = data?.meta.total ?? 0

  return (
    <div className="container mx-auto max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
            <p className="text-muted-foreground mt-1">
              Manage all client assets across the organization
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            New Asset
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search assets by name, URL, or contact..."
              value={inputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-3">
            <div className="w-40">
              <SmoothSelect
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(value) => updateParams({ status: value === "all" ? undefined : value })}
                className="[&>button]:min-h-9 [&>button]:h-9 [&>button]:text-xs"
              />
            </div>
            <div className="w-44">
              <SmoothSelect
                options={[{ value: "all", label: "All Types" }, ...ASSET_TYPES]}
                value={typeFilter}
                onChange={(value) => updateParams({ type: value === "all" ? undefined : value })}
                className="[&>button]:min-h-9 [&>button]:h-9 [&>button]:text-xs"
              />
            </div>
          </div>
        </div>

        {/* Results summary */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            Showing {data?.data.length ?? 0} of {total} assets
          </p>
        )}

        {/* Table */}
        <AssetTable
          data={data?.data ?? []}
          isLoading={isLoading}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />

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

      <AssetCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        isPending={isCreating || isCreatingMonitor}
        types={ASSET_TYPES}
        clients={clientsData?.data ?? []}
      />
    </div>
  )
}
