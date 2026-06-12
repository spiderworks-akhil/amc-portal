export const AUTO_RENEW_OPTIONS = [
  { value: "all", label: "All" },
  { value: "true", label: "Auto-renew" },
  { value: "false", label: "Manual renew" },
] as const

export function getExpiryBadge(
  daysToExpiry: number | null
): { label: string; color: "red" | "amber" | "emerald" | "gray" } | null {
  if (daysToExpiry === null) return null
  if (daysToExpiry <= 0) return { label: "Expired", color: "red" }
  if (daysToExpiry <= 30) return { label: `${daysToExpiry}d left`, color: "amber" }
  return { label: "Active", color: "emerald" }
}
