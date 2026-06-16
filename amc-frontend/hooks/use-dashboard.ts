"use client"

import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/api-client"
import type { DomainListItem } from "@/types/api"

/** Domain returned from /domain/expiring endpoint */
export interface ExpiringDomain {
  id: string
  fqdn: string
  expiry_date: string | null
  auto_renew: boolean
  last_checked_at: string | null
  asset_name: string
  client_name: string
  client_email: string | null
  days_to_expiry: number | null
}

/** Stats from /domain/stats endpoint */
export interface DomainExpiryStats {
  total: number
  expired: number
  expiring_30_days: number
  expiring_60_days: number
  expiring_90_days: number
}

/** Dashboard summary counts */
export interface DashboardSummary {
  totalClients: number
  totalAssets: number
  totalContracts: number
  totalDomains: number
  activeContracts: number
}

function useExpiringDomains(days: number = 30) {
  return useQuery({
    queryKey: ["dashboard", "expiring-domains", days],
    queryFn: async () => {
      const { data } = await apiClient.get<ExpiringDomain[]>("/domain/expiring", {
        params: { days },
      })
      // Compute days_to_expiry client-side since the backend doesn't return it
      const now = new Date()
      return data.map((d) => ({
        ...d,
        days_to_expiry: d.expiry_date
          ? Math.ceil((new Date(d.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }))
    },
  })
}

function useDomainExpiryStats() {
  return useQuery({
    queryKey: ["dashboard", "domain-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<DomainExpiryStats>("/domain/stats")
      return data
    },
  })
}

function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary")
      console.log("daata", data);
      
      return data
    },
  })
}

export { useExpiringDomains, useDomainExpiryStats, useDashboardSummary }
