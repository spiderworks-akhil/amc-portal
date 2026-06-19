"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReminderTable, type SortField } from "./reminder-table"
import { ReminderRulesTable, type RuleSortField } from "./reminder-rules-table"
import { ReminderRuleCreateDrawer } from "./reminder-rule-create-drawer"
import { ReminderRuleEditDrawer } from "./reminder-rule-edit-drawer"
import {
  useReminders,
  useDeleteReminder,
  useReminderRules,
  useCreateReminderRule,
  useUpdateReminderRule,
  useDeleteReminderRule,
} from "@/hooks/use-reminders"
import { useDebounce } from "@/hooks/use-debounce"
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
import { Search, Bell, BellRing, ToggleLeft, Plus, Info } from "lucide-react"
import type { ReminderRuleListItem, CreateReminderRulePayload } from "@/types/api"

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "escalated", label: "Escalated" },
]

const TARGET_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "domain", label: "Domain" },
  { value: "ssl", label: "SSL" },
  { value: "contract", label: "Contract" },
  { value: "server", label: "Server" },
]

export function RemindersPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tab = searchParams.get("tab") || "rules"
  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const statusFilter = searchParams.get("status") || "all"
  const targetTypeFilter = searchParams.get("target_type") || "all"
  const sortField = (searchParams.get("sort_by") || "trigger_date") as SortField
  const sortOrder = (searchParams.get("sort_order") || "desc") as "asc" | "desc"
  const limit = 50

  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 300)

  const [createRuleOpen, setCreateRuleOpen] = useState(false)
  const [editRuleOpen, setEditRuleOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ReminderRuleListItem | null>(null)

  useEffect(() => {
    if (search !== inputValue && search !== debouncedSearch) {
      setInputValue(search)
    }
  }, [search, debouncedSearch, inputValue])

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

  const { data: remindersData, isLoading: remindersLoading } = useReminders({
    page,
    status: statusFilter !== "all" ? statusFilter : undefined,
    target_type: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
    limit,
  })

  const { data: rulesData, isLoading: rulesLoading } = useReminderRules()

  const { mutate: deleteReminder } = useDeleteReminder()
  const { mutate: createRule, isPending: isCreatingRule } = useCreateReminderRule()
  const { mutate: updateRule, isPending: isUpdatingRule } = useUpdateReminderRule()
  const { mutate: deleteRule } = useDeleteReminderRule()

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })
      if (!updates.page && !updates.tab) params.set("page", "1")
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", value)
      params.set("page", "1")
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

  const handleRuleSort = useCallback(
    (field: RuleSortField) => {
      updateParams({ sort_by: field, sort_order: sortOrder === "asc" ? "desc" : "asc" })
    },
    [sortOrder, updateParams]
  )

  const handleDeleteReminder = useCallback(
    (id: string) => {
      deleteReminder(id)
    },
    [deleteReminder]
  )

  const handleCreateRuleSubmit = useCallback(
    (data: CreateReminderRulePayload) => {
      createRule(data, {
        onSuccess: () => setCreateRuleOpen(false),
      })
    },
    [createRule]
  )

  const handleEditRuleSubmit = useCallback(
    (data: Record<string, unknown>) => {
      if (!editingRule) return
      updateRule({ id: editingRule.id, ...data } as Parameters<typeof updateRule>[0], {
        onSuccess: () => {
          setEditRuleOpen(false)
          setEditingRule(null)
        },
      })
    },
    [updateRule, editingRule]
  )

  const handleDeleteRule = useCallback(
    (id: string) => {
      deleteRule(id)
    },
    [deleteRule]
  )

  const handleEditRule = useCallback(
    (rule: ReminderRuleListItem) => {
      setEditingRule(rule)
      setEditRuleOpen(true)
    },
    []
  )

  const totalPages = remindersData?.meta.totalPages ?? 0
  const total = remindersData?.meta.total ?? 0

  return (
    <div className="container mx-auto max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Configure automatic expiry notifications — reminders are generated and sent automatically
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="rules" className="gap-2">
                <ToggleLeft className="size-4" />
                Rules
              </TabsTrigger>
              <TabsTrigger value="log" className="gap-2">
                <BellRing className="size-4" />
                Notification Log
              </TabsTrigger>
            </TabsList>

            {tab === "rules" && (
              <Button onClick={() => setCreateRuleOpen(true)}>
                <Plus className="size-4 mr-1.5" />
                New Rule
              </Button>
            )}
          </div>

          {/* Rules Tab — primary feature */}
          <TabsContent value="rules" className="space-y-4 mt-4">
            {/* Info banner */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
              <Info className="size-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">How automated notifications work</p>
                <p className="text-blue-600/80 dark:text-blue-400/80 text-xs leading-relaxed">
                  Rules define when and how notifications are sent. For example, create a rule that sends an email 30, 14, 7, and 1 day
                  before a domain expires. A background job runs every 6 hours, checks entities nearing expiry, and automatically sends
                  notifications to the client&apos;s contacts. The notification log shows everything that was sent.
                </p>
              </div>
            </div>

            {!rulesLoading && (
              <p className="text-xs text-muted-foreground">
                {rulesData?.length ?? 0} rule{(rulesData?.length ?? 0) !== 1 ? "s" : ""} configured
              </p>
            )}

            <ReminderRulesTable
              data={rulesData ?? []}
              isLoading={rulesLoading}
              sortField="name"
              sortOrder="asc"
              onSort={handleRuleSort}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
            />
          </TabsContent>

          {/* Notification Log Tab — read-only history */}
          <TabsContent value="log" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
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
                <div className="w-40">
                  <SmoothSelect
                    options={TARGET_TYPE_OPTIONS}
                    value={targetTypeFilter}
                    onChange={(value) => updateParams({ target_type: value === "all" ? undefined : value })}
                    className="[&>button]:min-h-9 [&>button]:h-9 [&>button]:text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Results summary */}
            {!remindersLoading && (
              <p className="text-xs text-muted-foreground">
                Showing {remindersData?.data.length ?? 0} of {total} notifications
              </p>
            )}

            <ReminderTable
              data={remindersData?.data ?? []}
              isLoading={remindersLoading}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
              onDelete={handleDeleteReminder}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Rule Drawer */}
      <ReminderRuleCreateDrawer
        open={createRuleOpen}
        onOpenChange={setCreateRuleOpen}
        onSubmit={handleCreateRuleSubmit}
        isPending={isCreatingRule}
      />

      {/* Edit Rule Drawer */}
      {editingRule && (
        <ReminderRuleEditDrawer
          key={`edit-rule-${editingRule.id}`}
          open={editRuleOpen}
          onOpenChange={(open) => { setEditRuleOpen(open); if (!open) setEditingRule(null) }}
          onSubmit={handleEditRuleSubmit}
          isPending={isUpdatingRule}
          rule={editingRule}
        />
      )}
    </div>
  )
}
