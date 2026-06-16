"use client"

import {
  useExpiringDomains,
  useDomainExpiryStats,
  useDashboardSummary,
  useExpiringContracts,
  useExpiringSsl,
} from "@/hooks/use-dashboard"
import { CriticalAlertsBanner } from "@/components/dashboard/critical-alerts-banner"
import { StatCards } from "@/components/dashboard/stat-cards"
import { DomainHealth } from "@/components/dashboard/domain-health"
import { ExpiringDomainsList } from "@/components/dashboard/expiring-domains-list"
import { ExpiringContracts } from "@/components/dashboard/expiring-contracts"
import { ExpiringSsl } from "@/components/dashboard/expiring-ssl"
import { QuickActions } from "@/components/dashboard/quick-actions"

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: expiringDomains, isLoading: domainsLoading } = useExpiringDomains(90)
  const { data: expiryStats, isLoading: statsLoading } = useDomainExpiryStats()
  const { data: expiringContracts, isLoading: contractsLoading } = useExpiringContracts()
  const { data: expiringSsl, isLoading: sslLoading } = useExpiringSsl()


  // Critical alerts: expiring within 7 days (not already expired)
  const criticalDomains = (expiringDomains || []).filter(
    (d) => d.days_to_expiry !== null && d.days_to_expiry > 0 && d.days_to_expiry <= 7
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto px-4 py-1 max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of your infrastructure and upcoming expirations.
          </p>
        </div>

        <CriticalAlertsBanner domains={criticalDomains} />
        <StatCards summary={summary} expiryStats={expiryStats} isLoading={summaryLoading} />
        {/* <ExpiredItems expiredDomains={expiredDomains} expiredSsl={expiredSsl} /> */}

        {/* Domain Health + Expiring Domains */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DomainHealth stats={expiryStats} isLoading={statsLoading} />
          <ExpiringDomainsList domains={expiringDomains} isLoading={domainsLoading} />
        </div>

        {/* Contracts + SSL Expiring */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpiringContracts contracts={expiringContracts} isLoading={contractsLoading} />
          <ExpiringSsl certs={expiringSsl} isLoading={sslLoading} />
        </div>

        <QuickActions />
      </div>
    </div>
  )
}
