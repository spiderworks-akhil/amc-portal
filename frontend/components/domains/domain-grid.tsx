"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { DomainListItem } from "@/types/api"
import { AUTO_RENEW_OPTIONS, STATUS_OPTIONS } from "./constants"
import { SmoothSelect } from "../ui/smooth-select"
import { DomainTable } from "./domain-table"
import { ExpiryDateRangeFilter } from "./expiry-date-range-filter"

interface DomainGridProps {
  data: DomainListItem[]
  page: number
  totalPages: number
  isLoading: boolean
  search: string
  autoRenewFilter: string
  statusFilter: string
  expiryDateFrom?: string
  expiryDateTo?: string
  isDeleting?: boolean
  onSearchChange: (value: string) => void
  onAutoRenewChange: (value: string) => void
  onStatusChange: (value: string) => void
  onExpiryDateRangeChange: (range: { from?: string; to?: string }) => void
  onPageChange: (page: number) => void
  onDomainClick: (id: string) => void
  onDelete: (id: string) => void
}

export function DomainGrid({
  data,
  page,
  totalPages,
  isLoading,
  search,
  autoRenewFilter,
  statusFilter,
  expiryDateFrom,
  expiryDateTo,
  isDeleting,
  onSearchChange,
  onAutoRenewChange,
  onStatusChange,
  onExpiryDateRangeChange,
  onPageChange,
  onDomainClick,
  onDelete,
}: DomainGridProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search domains by name or project..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SmoothSelect
            options={STATUS_OPTIONS.map((o) => ({ ...o, label: o.value === "all" ? "All Status" : o.value === "expiring_soon" ? "Expiring Soon" : o.label }))}
            value={statusFilter}
            onChange={onStatusChange}
            className="[&>button]:min-h-9 [&>button]:h-9 [&>button]:text-xs w-36"
          />
          <ExpiryDateRangeFilter
            from={expiryDateFrom}
            to={expiryDateTo}
            onChange={onExpiryDateRangeChange}
          />
        </div>
      </div>

      <DomainTable
        data={data}
        isLoading={isLoading}
        isDeleting={isDeleting}
        onDelete={onDelete}
        onView={onDomainClick}
      />

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
                      onPageChange(pageNum)
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
                  if (page < totalPages) onPageChange(page + 1)
                }}
                className={
                  page === totalPages ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
