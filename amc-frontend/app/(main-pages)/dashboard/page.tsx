"use client"

import { useSession } from "next-auth/react"
import { useDashboardOverview } from "@/hooks/use-dashboard"
import { CriticalAlertsBanner } from "@/components/dashboard/critical-alerts-banner"
import { StatCards } from "@/components/dashboard/stat-cards"
import { DomainHealth } from "@/components/dashboard/domain-health"
import { ExpiringDomainsList } from "@/components/dashboard/expiring-domains-list"
import { ExpiringContracts } from "@/components/dashboard/expiring-contracts"
import { ExpiringSsl } from "@/components/dashboard/expiring-ssl"
import { ExpiredItems } from "@/components/dashboard/expired-items"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { MonitorHealthWidget } from "@/components/dashboard/monitor-health"

export default function DashboardPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const { data, isLoading } = useDashboardOverview(userId)

  const summary = data?.summary
  const expiryStats = data?.domainExpiryStats
  const expiringDomains = data?.expiringDomains
  const expiringContracts = data?.expiringContracts
  const expiringSsl = data?.expiringSsl
  // !! if not gonna use this remove query from  backend for optmization
  const expiredDomains = data?.expiredDomains || []
  const expiredSslCerts = data?.expiredSslCerts || []

  // Critical alerts: filtered to manager's clients only, expiring within 7 days
  const criticalDomains = (data?.managerExpiringDomains || []).filter(
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
        <StatCards summary={summary} expiryStats={expiryStats} isLoading={isLoading} />
        {/* <ExpiredItems expiredDomains={expiredDomains} expiredSsl={expiredSslCerts} /> */}

        {/* Monitor Health + Domain Health + Expiring Domains */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MonitorHealthWidget summary={data?.monitorSummary} isLoading={isLoading} />
          <DomainHealth stats={expiryStats} isLoading={isLoading} />
          <ExpiringDomainsList domains={expiringDomains} isLoading={isLoading} />
        </div>

        {/* Contracts + SSL Expiring */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpiringContracts contracts={expiringContracts} isLoading={isLoading} />
          <ExpiringSsl certs={expiringSsl} isLoading={isLoading} />
        </div>

        <QuickActions />
      </div>
    </div>
  )
}
