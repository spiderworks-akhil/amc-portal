"use client"


import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  useExpiringDomains,
  useDomainExpiryStats,
  useDashboardSummary,
} from "@/hooks/use-dashboard"
import { formatDate } from "@/lib/format-utils"
import {
  Users,
  HardDrive,
  FileText,
  Globe,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  CalendarClock,
  Activity,
} from "lucide-react"

function getExpiryBadge(days: number | null) {
  if (days === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        <Clock className="size-3" />
        No date
      </span>
    )
  }
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
        <XCircle className="size-3" />
        Expired
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
        <AlertTriangle className="size-3" />
        {days}d left
      </span>
    )
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
        <Clock className="size-3" />
        {days}d left
      </span>
    )
  }
  if (days <= 60) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
        <CalendarClock className="size-3" />
        {days}d left
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
      <CheckCircle2 className="size-3" />
      {days}d left
    </span>
  )
}

function StatCardSkeleton() {
  return (
    <Card interactive>
      <CardContent className="pt-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
        <Skeleton className="mt-3 h-8 w-16" />
        <Skeleton className="mt-1.5 h-3 w-32" />
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const router = useRouter()

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: expiringDomains, isLoading: domainsLoading } = useExpiringDomains(90)
  const { data: expiryStats, isLoading: statsLoading } = useDomainExpiryStats()
console.log("summary", summary);

  const statCards = summary
    ? [
        {
          label: "Total Clients",
          value: summary.totalClients,
          icon: Users,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-950/30",
        },
        {
          label: "Total Assets",
          value: summary.totalAssets,
          icon: HardDrive,
          color: "text-violet-600 dark:text-violet-400",
          bg: "bg-violet-50 dark:bg-violet-950/30",
        },
        {
          label: "Active Contracts",
          value: summary.activeContracts,
          icon: FileText,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
        },
        {
          label: "Total Domains",
          value: summary.totalDomains,
          icon: Globe,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-950/30",
        },
      ]
    : []

  const expiryBreakdown = expiryStats
    ? [
        { label: "Expired", count: expiryStats.expired, color: "text-red-600 dark:text-red-400", icon: XCircle },
        { label: "Within 30 days", count: expiryStats.expiring_30_days, color: "text-amber-600 dark:text-amber-400", icon: AlertTriangle },
        { label: "31–60 days", count: expiryStats.expiring_60_days, color: "text-blue-600 dark:text-blue-400", icon: Clock },
        { label: "61–90 days", count: expiryStats.expiring_90_days, color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
      ]
    : []

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of your infrastructure and upcoming expirations.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards.map((card) => (
                <Card key={card.label} interactive>
                  <CardContent className="pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                      <div className={`size-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                        <card.icon className={`size-4.5 ${card.color}`} />
                      </div>
                    </div>
                    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
                      {card.value.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Domain Expiry Breakdown + Expiring List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expiry Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                Domain Expiry Overview
              </CardTitle>
              <CardDescription>
                Breakdown of domain expiration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-5 w-8" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {expiryBreakdown.map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2.5">
                        <item.icon className={`size-4 ${item.color}`} />
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${item.color}`}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Total Domains</span>
                    <span className="text-sm font-bold tabular-nums">{expiryStats?.total ?? 0}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expiring Domains List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-muted-foreground" />
                  Expiring Domains
                </CardTitle>
                <CardDescription>
                  Domains expiring within the next 90 days
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => router.push("/domains")}
              >
                View all
                <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {domainsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : !expiringDomains?.length ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle2 className="size-10 mx-auto mb-3 opacity-30 text-emerald-500" />
                  <p className="text-sm font-medium">All clear!</p>
                  <p className="text-xs mt-1">No domains expiring in the next 90 days.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {expiringDomains.slice(0, 10).map((domain) => (
                    <div
                      key={domain.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/domains/${domain.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") router.push(`/domains/${domain.id}`)
                      }}
                      className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent/50 group cursor-pointer"
                    >
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Globe className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {domain.fqdn}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{domain.client_name}</span>
                          {domain.expiry_date && (
                            <>
                              <span>·</span>
                              <span className="shrink-0">{formatDate(domain.expiry_date)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {domain.auto_renew && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Auto
                          </span>
                        )}
                        {getExpiryBadge(domain.days_to_expiry)}
                      </div>
                    </div>
                  ))}
                  {expiringDomains.length > 10 && (
                    <div className="pt-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => router.push("/domains")}
                      >
                        View {expiringDomains.length - 10} more
                        <ArrowRight className="size-3.5 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump to common management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Manage Clients", icon: Users, href: "/clients", color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" },
                { label: "View Assets", icon: HardDrive, href: "/assets", color: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400" },
                { label: "Track Contracts", icon: FileText, href: "/contracts", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" },
                { label: "Domain Health", icon: Globe, href: "/domains", color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className="flex items-center gap-3 rounded-lg border border-border/60 p-3.5 text-left transition-all hover:border-primary/30 hover:shadow-sm hover:bg-accent/30 group cursor-pointer"
                >
                  <div className={`size-9 rounded-lg flex items-center justify-center ${action.color}`}>
                    <action.icon className="size-4" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
