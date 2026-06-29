import { z } from "zod"

/**
 * Validates a domain FQDN (Fully Qualified Domain Name).
 * Rules:
 * - Each label: alphanumeric + hyphens, must start/end with alphanumeric, max 63 chars
 * - Labels separated by dots
 * - TLD must be at least 2 alpha characters
 * - Rejects protocols (http://, https://), paths, trailing dots
 */
const FQDN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

/**
 * Strip protocol, path, trailing dot, and whitespace from a potential FQDN input.
 * This handles users pasting URLs like "https://www.example.com/path" instead of just "example.com".
 * Exported for use in live DNS verification effects (not just form submission).
 */
export function cleanFqdnInput(val: string): string {
  let cleaned = val.trim().toLowerCase()
  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, "")

  // Strip path, query string, fragment
  cleaned = cleaned.split("/")[0].split("?")[0].split("#")[0]
  // Strip trailing dot
  cleaned = cleaned.replace(/\.+$/, "")
  return cleaned
}

/** Validate each nameserver in a comma-separated list */
function validateNameserverEntry(ns: string): string | null {
  const trimmed = ns.trim().toLowerCase()
  if (!trimmed) return null // skip empty
  if (trimmed.length > 255) return `"${trimmed}" exceeds 255 characters`
  if (!FQDN_REGEX.test(trimmed)) {
    return `"${trimmed}" is not a valid nameserver hostname`
  }
  return null
}

/**
 * Shared FQDN field schema with preprocessing and strict regex validation.
 * - Cleans input (strips protocol, path, trailing dot)
 * - Validates FQDN format via regex
 * - Enforces max 255 chars
 */
export const fqdnField = z
  .string()
  .min(1, "Domain name is required")
  .transform((val) => cleanFqdnInput(val))
  .pipe(
    z
      .string()
      .regex(FQDN_REGEX, "Invalid domain format — enter a valid domain like 'example.com'")
      .max(255, "Domain name must be 255 characters or fewer"),
  )

/** Shared refinement: nameserver + date validation — reused across create/edit schemas */
function domainRefinement(
  data: { nameservers?: string; registered_date?: string; expiry_date?: string },
  ctx: z.RefinementCtx,
) {
  // Nameserver entries must be valid FQDNs
  if (data.nameservers && data.nameservers.trim()) {
    const entries = data.nameservers.split(",").map((s) => s.trim()).filter(Boolean)
    if (entries.length > 13) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum 13 nameservers allowed",
        path: ["nameservers"],
      })
    }
    for (const entry of entries) {
      const err = validateNameserverEntry(entry)
      if (err) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err,
          path: ["nameservers"],
        })
        break
      }
    }
  }

  // Date cross-validation
  const { registered_date, expiry_date } = data
  if (registered_date && expiry_date) {
    const registered = new Date(registered_date)
    const expiry = new Date(expiry_date)
    if (!isNaN(registered.getTime()) && !isNaN(expiry.getTime())) {
      if (expiry <= registered) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiry date must be after registered date",
          path: ["expiry_date"],
        })
      }

    }
  }


}

/** Base object fields shared by all create-domain schemas (no asset_id) */
const createDomainBase = {
  fqdn: fqdnField,
  registered_date: z.string().optional(),
  expiry_date: z.string().optional(),
  auto_renew: z.boolean().optional(),
  nameservers: z
    .string()
    .max(2000, "Nameservers list must be 2000 characters or fewer")
    .optional(),
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .optional(),
}

/**
 * Standalone domain create schema — includes asset_id.
 */
export const createDomainSchema = z
  .object({ asset_id: z.string().min(1, "Project is required"), ...createDomainBase })
  .superRefine(domainRefinement)

/**
 * Project-detail domain create schema — no asset_id (injected from props).
 */
export const projectDetailDomainSchema = z
  .object(createDomainBase)
  .superRefine(domainRefinement)

/**
 * Domain edit schema — includes registrar_id, no asset_id.
 */
export const editDomainSchema = z
  .object({
    ...createDomainBase,
    registrar_id: z.string().optional(),
  })
  .superRefine(domainRefinement)

export type CreateDomainFormValues = z.infer<typeof createDomainSchema>
export type ProjectDetailDomainFormValues = z.infer<typeof projectDetailDomainSchema>
export type EditDomainFormValues = z.infer<typeof editDomainSchema>
