"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProjectTable } from "./project-table"
import { useProjects, useProject, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects"
import { useDebounce } from "@/hooks/use-debounce"
import type { CreateProjectPayload } from "@/types/api"
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
import type { ProjectListItem } from "@/types/api"
import type { SortField } from "./project-table"
import { ProjectCreateDialog } from "./project-create-dialog"
import { ProjectEditForm } from "./project-details/project-edit-form"
import { useClient } from "@/hooks/use-clients"

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "live", label: "Live" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "parked", label: "Parked" },
]

const PROJECT_TYPES = [
  { value: "website", label: "Website" },
  { value: "landing_page", label: "Landing Page" },
  { value: "mobile_application", label: "Mobile Application" },
]

export function ProjectsPageContent() {
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
  const [editProjectId, setEditProjectId] = useState<string | null>(null)

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

  const { data, isLoading } = useProjects({
    page,
    search,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit,
    sort_by: sortField,
    sort_order: sortOrder,
  })

  const { mutate: createProject, isPending: isCreating } = useCreateProject()
  const { mutate: deleteProject } = useDeleteProject()
  const { data: editProject } = useProject(editProjectId)
  const { data: editProjectClient } = useClient(editProject?.client_id ?? null)
  const updateProject = useUpdateProject()

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
    (formData: { client_id?: string; name: string; type: string; primary_contact_name?: string; primary_contact_email?: string; notes?: string }) => {
      if (!formData.client_id) return

      createProject(formData as CreateProjectPayload, {
        onSuccess: () => setCreateOpen(false),
      })
    },
    [createProject]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteProject(id)
    },
    [deleteProject]
  )

  const handleView = useCallback(
    (id: string) => {
      router.push(`/projects/${id}`)
    },
    [router]
  )

  const handleEditSubmit = useCallback(
    (data: {
      name: string
      primary_contact_name?: string
      primary_contact_email?: string
      status?: string
      monitoring_enabled?: boolean
      notes?: string
      server_ids?: string[]
    }) => {
      if (!editProjectId) return
      updateProject.mutate(
        { id: editProjectId, ...data },
        { onSuccess: () => setEditProjectId(null) }
      )
    },
    [editProjectId, updateProject]
  )

  const handleEdit = useCallback(
    (project: ProjectListItem) => {
      setEditProjectId(project.id)
    },
    []
  )

  const totalPages = data?.meta.totalPages ?? 0
  const total = data?.meta.total ?? 0

  return (
    <div className="container mx-auto max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage all projects across the organization
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            New Project
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search projects by name, URL, or contact..."
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
                options={[{ value: "all", label: "All Types" }, ...PROJECT_TYPES]}
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
            Showing {data?.data.length ?? 0} of {total} projects
          </p>
        )}

        {/* Table */}
        <ProjectTable
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

      <ProjectCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        isPending={isCreating}
        types={PROJECT_TYPES}
      />

      {editProject && (
        <ProjectEditForm
          key={`edit-project-${editProject.id}`}
          open={!!editProjectId}
          onOpenChange={(open) => { if (!open) setEditProjectId(null) }}
          onSubmit={handleEditSubmit}
          isPending={updateProject.isPending}
          project={{
            ...editProject,
            server_ids: editProject.servers.map((s) => s.id),
          }}
          contacts={editProjectClient?.contacts ?? []}
        />
      )}
    </div>
  )
}
