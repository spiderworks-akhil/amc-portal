export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  cloud: "Cloud",
  registrar: "Registrar",
  cdn: "CDN",
  email: "Email",
  other: "Other",
}

export function formatProviderType(type: string) {
  return PROVIDER_TYPE_LABELS[type] || type
}
