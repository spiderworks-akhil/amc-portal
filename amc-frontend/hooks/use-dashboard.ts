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

/** Monitor health summary for dashboard */
export interface MonitorSummary {
  totalMonitors: number
  upMonitors: number
  downMonitors: number
  unknownMonitors: number
}

/** SSL certificate list item for dashboard */
export interface DashboardSsl {
  id: string
  issuer?: string | null
  common_name?: string | null
  valid_to?: string | null
  type?: string | null
  last_checked_at?: string | null
  domain_fqdn: string
  asset_name?: string | null
  days_to_expiry: number | null
}

/** Consolidated dashboard overview response */
export interface DashboardOverview {
  summary: DashboardSummary
  domainExpiryStats: DomainExpiryStats
  expiringDomains: ExpiringDomain[]
  managerExpiringDomains: ExpiringDomain[]
  expiringContracts: DashboardContract[]
  expiringSsl: DashboardSsl[]
  expiredDomains: ExpiringDomain[]
  expiredSslCerts: DashboardSsl[]
  monitorSummary: MonitorSummary
}

export interface DashboardContract {
  id: string
  client_name: string
  contract_number: string | null
  billing_cycle: string
  start_date: string
  end_date: string
  renewal_date: string
  amount: string
  currency: string
  auto_renew: boolean
  scope: string | null
  status: string
  client_email: string | null
  days_to_renewal: number | null
}

function useDashboardOverview(managerId?: string) {
  return useQuery({
    queryKey: ["dashboard", "overview", managerId],
    queryFn: async () => {
      const params: Record<string, unknown> = {}
      if (managerId) params.manager_id = managerId
      const { data } = await apiClient.get<DashboardOverview>("/dashboard/overview", {
        params,
      })

      const now = new Date()
      const enrichDomain = (d: ExpiringDomain) => ({
        ...d,
        days_to_expiry: d.expiry_date
          ? Math.ceil((new Date(d.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })

      const enrichSsl = (s: DashboardSsl) => ({
        ...s,
        days_to_expiry: s.valid_to
          ? Math.ceil((new Date(s.valid_to).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })

      return {
        ...data,
        expiringDomains: (data.expiringDomains || []).map(enrichDomain),
        managerExpiringDomains: (data.managerExpiringDomains || []).map(enrichDomain),
        expiredDomains: (data.expiredDomains || []).map(enrichDomain),
        expiringContracts: (data.expiringContracts || []).map((c) => ({
          ...c,
          days_to_renewal: Math.ceil((new Date(c.renewal_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        })),
        expiringSsl: (data.expiringSsl || []).map(enrichSsl),
        expiredSslCerts: (data.expiredSslCerts || []).map(enrichSsl),
      }
    },
  })
}

export { useDashboardOverview }
