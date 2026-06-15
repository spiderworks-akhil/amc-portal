"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Info, CheckCircle2, AlertCircle, Check } from "lucide-react"
import DatePicker from "@/components/date-picker"
import { useDebounce } from "@/hooks/use-debounce"
import { lookupDomainDetails } from "@/hooks/use-domains"
import { lookupSslCertDetails } from "@/hooks/use-ssl"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SmoothSelect } from "@/components/ui/smooth-select"

const sslSchema = z.object({
  domain_id: z.string().min(1, "Domain is required"),
  common_name: z.string().optional(),
  issuer: z.string().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  type: z.string().optional(),
  sans: z.string().optional(),
})
type SslFormValues = z.infer<typeof sslSchema>

const SSL_TYPES = [
  { value: "dv", label: "Domain Validation (DV)" },
  { value: "ov", label: "Organization Validation (OV)" },
  { value: "ev", label: "Extended Validation (EV)" },
  { value: "wildcard", label: "Wildcard" },
]

interface DomainOption {
  id: string
  fqdn: string
}

interface CreateSslFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    domain_id: string
    asset_id?: string
    common_name?: string
    issuer?: string
    sans?: string[]
    valid_from?: string
    valid_to?: string
    type?: string
  }) => void
  isPending: boolean
  domains: DomainOption[]
  assetId: string
}

export function CreateSslForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  domains,
  assetId,
}: CreateSslFormProps) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SslFormValues>({
    resolver: zodResolver(sslSchema),
    defaultValues: {
      domain_id: "",
      common_name: "",
      issuer: "",
      valid_from: "",
      valid_to: "",
      type: "",
      sans: "",
    },
  })

  const watchedDomainId = watch("domain_id")

  // When a domain is selected from the dropdown, populate the common_name field
  // to trigger the auto-fill chain
  useEffect(() => {
    if (!watchedDomainId) return
    const selected = domains.find((d) => d.id === watchedDomainId)
    if (selected) {
      setValue("common_name", selected.fqdn, { shouldValidate: true })
    }
  }, [watchedDomainId, domains])

  // Reset form whenever drawer opens
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const watchedCommonName = watch("common_name")
  const debouncedCommonName = useDebounce(watchedCommonName, 500)

  const [dnsStatus, setDnsStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle")
  const [dnsError, setDnsError] = useState<string | null>(null)
  const [rdapLoading, setRdapLoading] = useState(false)
  const [tlsLoading, setTlsLoading] = useState(false)
  const [detectedRegistrar, setDetectedRegistrar] = useState<string | null>(null)
  const [detectedRegisteredDate, setDetectedRegisteredDate] = useState<string | null>(null)
  const [detectedExpiryDate, setDetectedExpiryDate] = useState<string | null>(null)
  const [detectedSslIssuer, setDetectedSslIssuer] = useState<string | null>(null)
  const [detectedSslSans, setDetectedSslSans] = useState<string[] | null>(null)
  const userModifiedValidFrom = useRef(false)
  const userModifiedValidTo = useRef(false)
  const userModifiedIssuer = useRef(false)
  const userModifiedSans = useRef(false)
  const userModifiedType = useRef(false)

  // Single-call DNS verification + RDAP enrichment for common_name
  useEffect(() => {
    const domainToCheck = (debouncedCommonName ?? "").replace(/^\*\./, "")
    if (!domainToCheck || domainToCheck.length < 3) {
      setDnsStatus("idle")
      setDnsError(null)
      setDetectedRegistrar(null)
      setDetectedRegisteredDate(null)
      setDetectedExpiryDate(null)
      return
    }

    let cancelled = false
    setDnsStatus("verifying")
    setDnsError(null)
    setDetectedRegistrar(null)
    setDetectedRegisteredDate(null)
    setDetectedExpiryDate(null)
    setRdapLoading(true)

    lookupDomainDetails(domainToCheck).then((details) => {
      if (cancelled) return
      setDnsStatus("valid")
      setDnsError(null)
      setRdapLoading(false)
      if (details.registrar) setDetectedRegistrar(details.registrar)
      if (details.registered_date) {
        setDetectedRegisteredDate(details.registered_date)
        if (!userModifiedValidFrom.current) {
          setValue("valid_from", details.registered_date, { shouldValidate: true })
        }
      }
      if (details.expiry_date) {
        setDetectedExpiryDate(details.expiry_date)
        if (!userModifiedValidTo.current) {
          setValue("valid_to", details.expiry_date, { shouldValidate: true })
        }
      }

      // After RDAP succeeds, fetch actual TLS certificate details
      setTlsLoading(true)
      lookupSslCertDetails(domainToCheck).then((cert) => {
        if (cancelled) return
        setTlsLoading(false)

        // Issuer (from live cert, overrides manual entry)
        if (cert.issuer && !userModifiedIssuer.current) {
          setValue("issuer", cert.issuer, { shouldValidate: true })
        }
        if (cert.issuer) setDetectedSslIssuer(cert.issuer)

        // SANs (comma-separated string for the text input)
        if (cert.sans && cert.sans.length > 0 && !userModifiedSans.current) {
          setValue("sans", cert.sans.join(", "), { shouldValidate: true })
        }
        if (cert.sans && cert.sans.length > 0) setDetectedSslSans(cert.sans)

        // SSL type (overrides manual selection)
        if (cert.type && !userModifiedType.current) {
          setValue("type", cert.type, { shouldValidate: true })
        }

        // Use actual certificate dates (more accurate than RDAP domain dates)
        if (cert.valid_from && !userModifiedValidFrom.current) {
          setValue("valid_from", cert.valid_from, { shouldValidate: true })
        }
        if (cert.valid_to && !userModifiedValidTo.current) {
          setValue("valid_to", cert.valid_to, { shouldValidate: true })
        }
      }).catch(() => {
        // TLS lookup is best-effort — don't show error, just don't populate
        if (!cancelled) setTlsLoading(false)
      })
    }).catch((err: unknown) => {
      if (cancelled) return
      setRdapLoading(false)
      setTlsLoading(false)
      setDnsStatus("invalid")
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setDnsError(msg || "Domain does not resolve")
    })

    return () => {
      cancelled = true
    }
  }, [debouncedCommonName])

  // Reset DNS status when drawer opens
  useEffect(() => {
    if (open) {
      setDnsStatus("idle")
      setDnsError(null)
      setDetectedRegistrar(null)
      setDetectedRegisteredDate(null)
      setDetectedExpiryDate(null)
      setDetectedSslIssuer(null)
      setDetectedSslSans(null)
      setRdapLoading(false)
      setTlsLoading(false)
      userModifiedValidFrom.current = false
      userModifiedValidTo.current = false
      userModifiedIssuer.current = false
      userModifiedSans.current = false
      userModifiedType.current = false
    }
  }, [open])

  const watchedValidFrom = watch("valid_from")
  const watchedValidTo = watch("valid_to")

  const onFormSubmit = (data: SslFormValues) => {
    const sansList = data.sans
      ? data.sans.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined
    const sans = sansList && sansList.length > 0 ? sansList : undefined

    onSubmit({
      domain_id: data.domain_id,
      asset_id: assetId,
      common_name: data.common_name?.trim() || undefined,
      issuer: data.issuer?.trim() || undefined,
      sans,
      valid_from: data.valid_from || undefined,
      valid_to: data.valid_to || undefined,
      type: data.type || undefined,
    })

    reset()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
        <DrawerHeader>
          <DrawerTitle>Create SSL Certificate</DrawerTitle>
          <DrawerDescription>Add a new SSL certificate and link it to a domain.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          {/* Domain Selection */}
          <div className="space-y-2">
            <Label>
              Domain <span className="text-destructive">*</span>
            </Label>
            <SmoothSelect
              options={domains.length === 0 ? [] : domains.map((d) => ({ value: d.id, label: d.fqdn }))}
              value={watch("domain_id")}
              onChange={(value) =>
                setValue("domain_id", value, { shouldValidate: true })
              }
              placeholder={domains.length === 0 ? "No domains available" : "Select a domain..."}
              className="w-full"
            />
            {errors.domain_id?.message && <p className="text-xs text-destructive">{errors.domain_id.message}</p>}
            {domains.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Create a domain first before adding an SSL certificate.
              </p>
            )}
          </div>

          {/* Common Name */}
          <div className="space-y-2">
            <Label htmlFor="ssl-cn">
              Common Name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="relative">
              <Input
                id="ssl-cn"
                {...register("common_name")}
                placeholder="e.g., example.com"
                autoFocus
                className={dnsStatus === "invalid" ? "border-destructive pr-10" : dnsStatus === "valid" ? "pr-10" : dnsStatus === "verifying" ? "pr-10" : ""}
              />
              {/* DNS status indicator */}
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {dnsStatus === "verifying" && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
                {dnsStatus === "valid" && (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                )}
                {dnsStatus === "invalid" && (
                  <AlertCircle className="size-4 text-destructive" />
                )}
              </div>
            </div>
            {dnsStatus === "invalid" && dnsError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3 shrink-0" />
                {dnsError}
              </p>
            )}
            {dnsStatus === "verifying" && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Verifying DNS...
              </p>
            )}
            {dnsStatus === "valid" && (watchedCommonName ?? "").length >= 3 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Domain resolves
              </p>
            )}
            {rdapLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Looking up domain details...
              </p>
            )}
            {detectedRegistrar && !rdapLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" />
                Registrar: {detectedRegistrar}
              </p>
            )}
            {detectedRegisteredDate && !rdapLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 ml-4">
                Registered: {detectedRegisteredDate}
              </p>
            )}
            {detectedExpiryDate && !rdapLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 ml-4">
                Expires: {detectedExpiryDate}
              </p>
            )}
          </div>

          {/* Issuer */}
          <div className="space-y-2">
            <Label htmlFor="ssl-issuer">Issuer</Label>
            <Input
              id="ssl-issuer"
              {...register("issuer", {
                onChange: () => { userModifiedIssuer.current = true },
              })}
              placeholder="e.g., Let's Encrypt, DigiCert"
            />
            {tlsLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Fetching certificate...
              </p>
            )}
            {!tlsLoading && detectedSslIssuer && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                <Check className="size-3.5" />
                Detected: {detectedSslIssuer}
              </p>
            )}
          </div>

          {/* SSL Type */}
          <div className="space-y-2">
            <Label>Certificate Type</Label>
            <SmoothSelect
              options={SSL_TYPES}
              value={watch("type")}
              onChange={(value) => {
                userModifiedType.current = true
                setValue("type", value, { shouldValidate: true })
              }}
              placeholder="Select type..."
              className="w-full"
            />
          </div>

          {/* Two-column: Valid From + Valid To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valid From</Label>
              <DatePicker
                value={watchedValidFrom ? new Date(watchedValidFrom) : null}
                onChange={(date) => {
                  userModifiedValidFrom.current = true
                  setValue("valid_from", format(date, "yyyy-MM-dd"), { shouldValidate: true })
                }}
                placeholder="Valid from"
              />
            </div>
            <div className="space-y-2">
              <Label>Valid To</Label>
              <DatePicker
                value={watchedValidTo ? new Date(watchedValidTo) : null}
                onChange={(date) => {
                  userModifiedValidTo.current = true
                  setValue("valid_to", format(date, "yyyy-MM-dd"), { shouldValidate: true })
                }}
                placeholder="Valid to"
              />
            </div>
          </div>

          {/* SANs */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="ssl-sans">Subject Alternative Names (SANs)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center justify-center size-3.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-help">
                      <Info className="size-3.5" />
                      <span className="sr-only">SAN format info</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64">
                    Enter additional domain names covered by this certificate, separated by commas.
                    <br />
                    Example: <kbd className="rounded-sm bg-background/20 px-1 font-mono">www.example.com, api.example.com</kbd>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="ssl-sans"
              {...register("sans", {
                onChange: () => { userModifiedSans.current = true },
              })}
              placeholder="e.g., www.example.com, api.example.com"
            />
            <p className="text-xs text-muted-foreground">Separate multiple names with commas.</p>
            {!tlsLoading && detectedSslSans && detectedSslSans.length > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                <Check className="size-3.5" />
                Detected: {detectedSslSans.slice(0, 3).join(", ")}{detectedSslSans.length > 3 ? ` +${detectedSslSans.length - 3} more` : ""}
              </p>
            )}
          </div>

          <DrawerFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || domains.length === 0}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Creating..." : "Create SSL Certificate"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
