"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Globe, AlertTriangle, ArrowRight } from "lucide-react"
import type { ExpiringDomain } from "@/hooks/use-dashboard"

interface CriticalAlertsBannerProps {
  domains: ExpiringDomain[]
}

export function CriticalAlertsBanner({ domains }: CriticalAlertsBannerProps) {
  const router = useRouter()

  if (domains.length === 0) return null

  return (
    <div className="relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-r from-red-50 via-red-50 to-amber-50 p-4 dark:border-red-900/50 dark:from-red-950/20 dark:via-red-950/20 dark:to-amber-950/20">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
            {domains.length} domain{domains.length !== 1 ? "s" : ""} need immediate attention
          </h3>
          <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/70">
            These domains expire within 7 days and need immediate action
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {domains.slice(0, 4).map((d) => (
              <button
                key={d.id}
                onClick={() => router.push(`/domains/${d.id}`)}
                className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-white dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950/80 cursor-pointer"
              >
                <Globe className="size-3" />
                {d.fqdn}
                <span className="text-red-400">
                  ({d.days_to_expiry}d)
                </span>
              </button>
            ))}
            {domains.length > 4 && (
              <span className="inline-flex items-center rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium text-red-500 dark:bg-red-950/50 dark:text-red-400">
                +{domains.length - 4} more
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
          onClick={() => router.push("/domains")}
        >
          View all
          <ArrowRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  )
}
