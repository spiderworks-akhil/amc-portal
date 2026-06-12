export const CONTRACT_STATUS_COLORS: Record<
  string,
  "emerald" | "amber" | "red" | "blue" | "gray"
> = {
  active: "emerald",
  expiring: "amber",
  expired: "red",
  draft: "blue",
  terminated: "gray",
}

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
}

export const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
  { value: "draft", label: "Draft" },
  { value: "terminated", label: "Terminated" },
] as const

export function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
