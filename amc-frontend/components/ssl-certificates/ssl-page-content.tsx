"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { SslGrid } from "@/components/ssl-certificates/ssl-grid"
import { useSslCertificates } from "@/hooks/use-ssl"
import { useDebounce } from "@/hooks/use-debounce"

export function SslPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const typeFilter = searchParams.get("type") || "all"
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

  const { data, isLoading } = useSslCertificates({
    page,
    search,
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit,
    sort_by: "valid_to",
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

  const handleSslClick = useCallback(
    (id: string) => {
      router.push(`/ssl-certificates/${id}`)
    },
    [router]
  )

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

        <SslGrid
          data={data?.data || []}
          page={page}
          totalPages={data?.meta.totalPages ?? 0}
          isLoading={isLoading}
          search={inputValue}
          typeFilter={typeFilter}
          onSearchChange={handleSearchChange}
          onTypeChange={handleTypeChange}
          onPageChange={handlePageChange}
          onSslClick={handleSslClick}
        />
      </div>
    </div>
  )
}
