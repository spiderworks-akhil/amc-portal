export const AUTO_RENEW_OPTIONS = [
  { value: "all", label: "All" },
  { value: "true", label: "Auto-renew" },
  { value: "false", label: "Manual renew" },
] as const

export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "expired", label: "Expired" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "active", label: "Active" },
] as const

export function getExpiryBadge(
  daysToExpiry: number | null
): { label: string; color: "red" | "amber" | "emerald" | "gray" } | null {
  if (daysToExpiry === null) return null
  if (daysToExpiry <= 0) return { label: "Expired", color: "red" }
  if (daysToExpiry <= 7) return { label: `${daysToExpiry}d left`, color: "red" }
  if (daysToExpiry <= 30) return { label: `${daysToExpiry}d left`, color: "amber" }
  if (daysToExpiry <= 60) return { label: `${daysToExpiry}d left`, color: "gray" }
  return { label: "Active", color: "emerald" }
}
