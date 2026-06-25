"use client"

import {
  AlertTriangle,
  ShieldAlert,
  Globe,
  Info,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SslWarningBadgeProps {
  isSelfSigned?: boolean
  hostnameMismatch?: boolean
  isExpired?: boolean
  /** When true, renders as compact icon-only badges (for table rows) */
  compact?: boolean
}

const WARNING_CONFIG = {
  selfSigned: {
    label: "Self-Signed",
    tooltip: "This certificate is self-signed — issuer matches the common name. Not trusted by browsers.",
    color: "orange" as const,
    icon: ShieldAlert,
  },
  hostnameMismatch: {
    label: "Hostname Mismatch",
    tooltip: "The certificate's common name does not match the domain it is associated with.",
    color: "red" as const,
    icon: Globe,
  },
  expired: {
    label: "Expired",
    tooltip: "This certificate has expired and is no longer valid.",
    color: "red" as const,
    icon: AlertTriangle,
  },
}

export function SslWarningBadges({
  isSelfSigned,
  hostnameMismatch,
  isExpired,
  compact = false,
}: SslWarningBadgeProps) {
  const warnings: Array<{ key: string; cfg: typeof WARNING_CONFIG[keyof typeof WARNING_CONFIG] }> = []

  if (isExpired) {
    warnings.push({ key: "expired", cfg: WARNING_CONFIG.expired })
  }
  if (isSelfSigned) {
    warnings.push({ key: "selfSigned", cfg: WARNING_CONFIG.selfSigned })
  }
  if (hostnameMismatch) {
    warnings.push({ key: "hostnameMismatch", cfg: WARNING_CONFIG.hostnameMismatch })
  }

  if (warnings.length === 0) return null

  if (compact) {
    // Compact mode: icon-only badges with tooltip via title
    return (
      <div className="flex items-center gap-1">
        {warnings.map(({ key, cfg }) => {
          const Icon = cfg.icon
          return (
            <span
              key={key}
              className={`inline-flex items-center justify-center size-5 rounded-full ${
                key === "expired" || key === "hostnameMismatch"
                  ? "bg-red-500/15 text-red-500"
                  : "bg-orange-500/15 text-orange-500"
              }`}
              title={cfg.tooltip}
            >
              <Icon className="size-3" />
              <span className="sr-only">{cfg.label}</span>
            </span>
          )
        })}
      </div>
    )
  }

  // Full mode: pill badges with labels
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {warnings.map(({ key, cfg }) => {
        const Icon = cfg.icon
        const isCritical = key === "expired" || key === "hostnameMismatch"
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none ${
              isCritical
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
            }`}
            title={cfg.tooltip}
          >
            <Icon className="size-3" />
            {cfg.label}
          </span>
        )
      })}
    </div>
  )
}

/** Adds SSL warning props to a cert object for use in components */
export function getSslWarnings(cert: {
  days_to_expiry?: number | null
  is_self_signed?: boolean | null
  hostname_mismatch?: boolean | null
}) {
  return {
    isExpired: cert.days_to_expiry !== null && cert.days_to_expiry !== undefined && cert.days_to_expiry <= 0,
    isSelfSigned: !!cert.is_self_signed,
    hostnameMismatch: !!cert.hostname_mismatch,
  }
}
