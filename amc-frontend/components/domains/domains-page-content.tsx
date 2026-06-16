"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { DomainGrid } from "@/components/domains/domain-grid"
import { useDomains, useDeleteDomain } from "@/hooks/use-domains"
import { useDebounce } from "@/hooks/use-debounce"

export function DomainsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const autoRenewFilter = searchParams.get("auto_renew") || "all"
  const statusFilter = searchParams.get("status") || "all"
  const expiryDateFrom = searchParams.get("expiry_from") || undefined
  const expiryDateTo = searchParams.get("expiry_to") || undefined
  const limit = 30

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

  const { data, isLoading } = useDomains({
    page,
    search,
    auto_renew:
      autoRenewFilter !== "all" ? autoRenewFilter === "true" : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit,
    sort_by: "expiry_date",
    sort_order: "asc",
    expiry_date_from: expiryDateFrom,
    expiry_date_to: expiryDateTo,
  })

  const deleteMutation = useDeleteDomain()

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

  const handleAutoRenewChange = useCallback(
    (value: string) => {
      updateParams({
        auto_renew: value === "all" ? undefined : value,
        page: "1",
      })
    },
    [updateParams]
  )

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

  const handleDomainClick = useCallback(
    (id: string) => {
      router.push(`/domains/${id}`)
    },
    [router]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id)
    },
    [deleteMutation]
  )

  const handleExpiryDateRangeChange = useCallback(
    (range: { from?: string; to?: string }) => {
      updateParams({
        expiry_from: range.from,
        expiry_to: range.to,
        page: "1",
      })
    },
    [updateParams]
  )

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Domains</h1>
            <p className="mt-1 text-muted-foreground">
              Track domain registrations, expiry dates, and SSL certificates
            </p>
          </div>
        </div>

        <DomainGrid
          data={data?.data || []}
          page={page}
          totalPages={data?.meta.totalPages ?? 0}
          isLoading={isLoading}
          search={inputValue}
          autoRenewFilter={autoRenewFilter}
          statusFilter={statusFilter}
          expiryDateFrom={expiryDateFrom}
          expiryDateTo={expiryDateTo}
          isDeleting={deleteMutation.isPending}
          onSearchChange={handleSearchChange}
          onAutoRenewChange={handleAutoRenewChange}
          onStatusChange={handleStatusChange}
          onExpiryDateRangeChange={handleExpiryDateRangeChange}
          onPageChange={handlePageChange}
          onDomainClick={handleDomainClick}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
