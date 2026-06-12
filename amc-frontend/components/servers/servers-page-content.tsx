"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { ServerGrid } from "@/components/servers/server-grid"
import { useServers } from "@/hooks/use-servers"
import { useProviders } from "@/hooks/use-providers"
import { useDebounce } from "@/hooks/use-debounce"

export function ServersPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const providerFilter = searchParams.get("provider_id") || "all"
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

  const { data, isLoading } = useServers({
    page,
    search,
    provider_id: providerFilter !== "all" ? providerFilter : undefined,
    limit,
    sort_by: "label",
    sort_order: "asc",
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

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: String(newPage) })
    },
    [updateParams]
  )

  const handleServerClick = useCallback(
    (id: string) => {
      router.push(`/servers/${id}`)
    },
    [router]
  )

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Servers</h1>
            <p className="mt-1 text-muted-foreground">
              Manage hosting servers, providers, and renewal dates
            </p>
          </div>
        </div>

        <ServerGrid
          data={data?.data || []}
          page={page}
          totalPages={data?.meta.totalPages ?? 0}
          isLoading={isLoading}
          search={inputValue}
          providerFilter={providerFilter}
          providers={providersData?.data ?? []}
          onSearchChange={handleSearchChange}
          onProviderChange={handleProviderChange}
          onPageChange={handlePageChange}
          onServerClick={handleServerClick}
        />
      </div>
    </div>
  )
}
