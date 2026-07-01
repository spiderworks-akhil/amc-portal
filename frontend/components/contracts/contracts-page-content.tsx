"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ContractGrid } from "@/components/contracts/contract-grid"
import { ContractCreateDrawer } from "@/components/contracts/contract-create-drawer"
import { useContracts, useCreateContract } from "@/hooks/use-contracts"
import { useDebounce } from "@/hooks/use-debounce"

export function ContractsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const statusFilter = searchParams.get("status") || "all"
  const limit = 30

  const createMutation = useCreateContract()
  const [createOpen, setCreateOpen] = useState(false)
  const [inputValue, setInputValue] = useState(search)
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
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const handleSearchChange = useCallback((value: string) => {
    setInputValue(value)
  }, [])

  const handleStatusChange = useCallback(
    (value: string) => {
      updateParams({
        status: value === "all" ? undefined : value,
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

  const handleCreateSubmit = useCallback(
    (data: {
      client_id: string
      contract_number?: string
      billing_cycle: string
      start_date: string
      end_date?: string
      renewal_date?: string
      amount?: number
      currency?: string
      auto_renew?: boolean
      scope?: string
      status?: string
    }) => {
      createMutation.mutate(data, {
        onSuccess: () => setCreateOpen(false),
      })
    },
    [createMutation]
  )

  const handleContractClick = useCallback(
    (id: string) => {
      router.push(`/contracts/${id}`)
    },
    [router]
  )

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
            <p className="mt-1 text-muted-foreground">
              Track AMC agreements, renewals, and contract value
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            New Contract
          </Button>
        </div>

        <ContractCreateDrawer
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreateSubmit}
          isPending={createMutation.isPending}
        />

        <ContractGrid
          data={data?.data || []}
          page={page}
          totalPages={data?.meta.totalPages ?? 0}
          isLoading={isLoading}
          search={inputValue}
          statusFilter={statusFilter}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          onPageChange={handlePageChange}
          onContractClick={handleContractClick}
        />
      </div>
    </div>
  )
}
