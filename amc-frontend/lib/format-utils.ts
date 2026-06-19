/**
 * Format a date string into a readable format (e.g., "Jun 12, 2026").
 * Returns an em-dash for null/undefined/empty values.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * Format a numeric amount string into a localized currency string (e.g., "$1,234.56").
 * Falls back to "USD" when currency is not provided.
 * Returns an em-dash for null/undefined/empty amounts.
 */
export function formatCurrency(
  amount: string | null | undefined,
  currency?: string | null
): string {
  if (!amount) return "\u2014"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(Number(amount))
  } catch {
    return `${currency || "USD"} ${amount}`
  }
}

export function formatInterval(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    return minutes ? `${hours}h ${minutes}m` : `${hours}h`
  }

  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return remainingSeconds
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`
  }

  return `${seconds}s`
}