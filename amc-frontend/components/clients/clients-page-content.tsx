// components/clients/clients-page-content.tsx
"use client"

import { useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { ClientGrid } from "@/components/clients/client-grid"
import { useClients, useSyncClient, useSyncClients } from "@/hooks/use-clients"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { CreateClientDialog } from "@/components/clients/create-client-dialog"

export function ClientsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const syncClient = useSyncClient()
  const syncAll = useSyncClients()

  const page = Number(searchParams.get("page")) || 1
  const search = searchParams.get("search") || ""
  const limit = 60

  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 300)

  useEffect(() => {
    if (search !== inputValue && search !== debouncedSearch) {
      setInputValue(search)
    }
  }, [search])
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

  const handleSync = useCallback(
    (id: string) => {
      setSyncingId(id)
      syncClient.mutate(id, {
        onSettled: () => setSyncingId(null),
      })
    },
    [syncClient],
  )



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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => syncAll.mutate()}
              disabled={syncAll.isPending}
              className="gap-1.5"
            >
              <RefreshCw className={`size-4 ${syncAll.isPending ? "animate-spin" : ""}`} />
              {syncAll.isPending ? "Syncing..." : "Sync All"}
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="size-4" />
              Create Client
            </Button>
          </div>
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
            onSync={handleSync}
            syncingId={syncingId}
          />
      </div>

      <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}