export const SSL_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "dv", label: "DV" },
  { value: "ov", label: "OV" },
  { value: "ev", label: "EV" },
  { value: "wildcard", label: "Wildcard" },
] as const

export const SSL_TYPE_LABELS: Record<string, string> = {
  dv: "DV",
  ov: "OV",
  ev: "EV",
  wildcard: "Wildcard",
}

export function formatSslType(type?: string | null) {
  if (!type) return null
  return SSL_TYPE_LABELS[type] || type.toUpperCase()
}

export function getExpiryBadge(
  daysToExpiry: number | null
): { label: string; color: "red" | "amber" | "emerald" | "gray" } | null {
  if (daysToExpiry === null) return null
  if (daysToExpiry <= 0) return { label: "Expired", color: "red" }
  if (daysToExpiry <= 30) return { label: `${daysToExpiry}d left`, color: "amber" }
  return { label: "Valid", color: "emerald" }
}
