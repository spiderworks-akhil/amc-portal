"use client"

import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/api-client"

/** Domain returned from /domain/expiring endpoint */
export interface ExpiringDomain {
  id: string
  client_id: string
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

/** Contract list item for dashboard */
export interface DashboardContract {
  id: string
  client_id: string
  client_name: string
  contract_number?: string | null
  billing_cycle: string
  start_date: string
  end_date: string
  renewal_date: string
  amount: string
  currency: string
  auto_renew: boolean
  scope?: string | null
  status: string
  created_at: string
  updated_at: string
  asset_count: number
  days_to_renewal: number | null
}

/** SSL certificate list item for dashboard */
export interface DashboardSsl {
  id: string
  domain_id: string
  issuer?: string | null
  common_name?: string | null
  sans: string[]
  valid_from?: string | null
  valid_to?: string | null
  type?: string | null
  last_checked_at?: string | null
  created_at: string
  updated_at: string
  domain_fqdn: string
  asset_name?: string | null
  days_to_expiry: number | null
}

/** Client domain health breakdown */
export interface ClientDomainHealth {
  client_id: string
  client_name: string
  total_domains: number
  expired: number
  expiring_30: number
  expiring_90: number
  healthy: number
}

function useExpiringDomains(days: number = 30) {
  return useQuery({
    queryKey: ["dashboard", "expiring-domains", days],
    queryFn: async () => {
      const { data } = await apiClient.get<ExpiringDomain[]>("/domain/expiring", {
        params: { days },
      })
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
      return data
    },
  })
}

function useExpiringContracts() {
  return useQuery({
    queryKey: ["dashboard", "expiring-contracts"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: DashboardContract[]; meta: { total: number } }>("/contract/list", {
        params: {
          status: "active",
          sort_by: "renewal_date",
          sort_order: "asc",
          limit: 50,
        },
      })
      const now = new Date()
      const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      const contracts = (data.data || []).filter((c) => {
        const renewalDate = new Date(c.renewal_date)
        return renewalDate <= ninetyDays
      }).map((c) => ({
        ...c,
        days_to_renewal: Math.ceil((new Date(c.renewal_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      }))
      return contracts
    },
  })
}

function useExpiringSsl() {
  return useQuery({
    queryKey: ["dashboard", "expiring-ssl"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: DashboardSsl[]; meta: { total: number } }>("/ssl/list", {
        params: {
          sort_by: "valid_to",
          sort_order: "asc",
          limit: 50,
        },
      })
      const now = new Date()
      const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      const certs = (data.data || []).filter((s) => {
        if (!s.valid_to) return false
        const validTo = new Date(s.valid_to)
        return validTo <= ninetyDays
      }).map((s) => ({
        ...s,
        days_to_expiry: s.valid_to
          ? Math.ceil((new Date(s.valid_to).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }))
      return certs
    },
  })
}



export {
  useExpiringDomains,
  useDomainExpiryStats,
  useDashboardSummary,
  useExpiringContracts,
  useExpiringSsl,
}
