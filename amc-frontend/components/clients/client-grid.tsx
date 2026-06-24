"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search, ChevronRight, Users } from "lucide-react"
import { ClientCard } from "./client-card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { ClientListItem } from "@/types/api"

interface ClientGridProps {
  data: ClientListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  isLoading: boolean
  search: string
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
  onClientClick: (id: string) => void
  onEdit: (id: string) => void
  onSync?: (id: string) => void
  syncingId?: string | null
}

export function ClientGrid({
  data,
  page,
  totalPages,
  isLoading,
  search,
  onSearchChange,
  onPageChange,
  onClientClick,
  onEdit,
  onSync,
  syncingId,
}: ClientGridProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
    if (!open) setOpen(true)
  }

  const handleInputFocus = () => {
    if (search) setOpen(true)
  }

  const handleSelectClient = (id: string) => {
    setOpen(false)
    onClientClick(id)
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div className="space-y-6">
      {/* Search / Combobox */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div ref={containerRef} className="flex-1 max-w-md relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search clients by name, email, or company..."
              value={search}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              className="pl-9"
            />
          </div>

          {open && data.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-input bg-popover shadow-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto p-1">
                {data.slice(0, 10).map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelectClient(client.id)}
                    className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-semibold">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.company || client.email || ""}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/30" />
                  </button>
                ))}
                {data.length > 10 && (
                  <div className="px-2.5 py-1.5 text-xs text-center text-muted-foreground border-t border-border/50">
                    Showing 10 of {data.length} results — continue typing to refine
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="size-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No clients found</h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              {search
                ? "No clients match your search. Try different keywords or filters."
                : "Get started by creating your first client from an external account."}
            </p>
          </div>
        ) : (
          data.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={onClientClick}
              onEdit={onEdit}
              onSync={onSync}
              isSyncing={syncingId === client.id}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) onPageChange(page - 1)
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {totalPages <= 7
              ? Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        onPageChange(pageNum)
                      }}
                      isActive={page === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))
              : (() => {
                  const pages: (number | "...")[] = []
                  if (page <= 4) {
                    for (let i = 1; i <= Math.min(5, totalPages); i++) pages.push(i)
                    if (totalPages > 5) { pages.push("..."); pages.push(totalPages) }
                  } else if (page >= totalPages - 3) {
                    pages.push(1); pages.push("...")
                    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
                  } else {
                    pages.push(1); pages.push("...")
                    for (let i = page - 1; i <= page + 1; i++) pages.push(i)
                    pages.push("..."); pages.push(totalPages)
                  }
                  return pages.map((p, i) =>
                    p === "..." ? (
                      <PaginationItem key={`e${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            onPageChange(p)
                          }}
                          isActive={page === p}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )
                })()}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) onPageChange(page + 1)
                }}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
