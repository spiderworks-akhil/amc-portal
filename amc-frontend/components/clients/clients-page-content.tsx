// components/clients/clients-page-content.tsx
"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { ClientGrid } from "@/components/clients/client-grid"
import { SyncButton } from "@/components/clients/sync-button"
import { useClients } from "@/hooks/use-clients"
import { useDebounce } from "@/hooks/use-debounce"

export function ClientsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const limit = 60

  // Local state for instant input feedback
  const [inputValue, setInputValue] = useState(search)
  // Debounce the value that drives the API call
  const debouncedSearch = useDebounce(inputValue, 300)

  // Sync URL search param back to local state (e.g. browser back/forward)
  useEffect(() => {
    if (search !== inputValue && search !== debouncedSearch) {
      setInputValue(search)
    }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync debounced value to URL (triggers the API fetch)
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

  const { data, isLoading } = useClients({ 
    page, 
    search, 
    limit, 
    sort_by: "name", 
    sort_order: "asc" 
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

  const handleSearchChange = useCallback(
    (value: string) => {
      setInputValue(value)
    },
    []
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: String(newPage) })
    },
    [updateParams]
  )



  const handleClientClick = useCallback((id: string) => {
    router.push(`/clients/${id}`)
  }, [router])

  const handleEdit = useCallback((id: string) => {
    router.push(`/clients/${id}?edit=true`)
  }, [router])

 

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground mt-1">
              Manage and view all your client information
            </p>
          </div>
          <SyncButton />
        </div>

        {/* View Content */}
          <ClientGrid
            data={data?.data || []}
            total={data?.meta.total ?? 0}
            page={page}
            limit={limit}
            totalPages={data?.meta.totalPages ?? 0}
            isLoading={isLoading}
            search={inputValue}
            onSearchChange={handleSearchChange}
            onPageChange={handlePageChange}
            onClientClick={handleClientClick}
            onEdit={handleEdit}
          />
      </div>

  
    </div>
  )
}