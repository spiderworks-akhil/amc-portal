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
import { Loader2, Info, CheckCircle2, AlertCircle } from "lucide-react"
import DatePicker from "@/components/date-picker"
import { useDebounce } from "@/hooks/use-debounce"
import { lookupDomainDetails } from "@/hooks/use-domains"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const domainSchema = z.object({
  fqdn: z.string().min(1, "Domain name is required").max(255),
  registered_date: z.string().optional(),
  expiry_date: z.string().optional(),
  auto_renew: z.boolean().optional(),
  nameservers: z.string().optional(),
  notes: z.string().optional(),
})
type DomainFormValues = z.infer<typeof domainSchema>

interface CreateDomainFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    asset_id: string
    fqdn: string
    registered_date?: string
    expiry_date?: string
    auto_renew?: boolean
    nameservers?: string[]
    notes?: string
  }) => void
  isPending: boolean
  assetId: string
}

export function CreateDomainForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  assetId,
}: CreateDomainFormProps) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      fqdn: "",
      registered_date: "",
      expiry_date: "",
      auto_renew: true,
      nameservers: "",
      notes: "",
    },
  })

  // Reset form whenever drawer opens
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const watchedFqdn = watch("fqdn")
  const debouncedFqdn = useDebounce(watchedFqdn, 500)

  const [dnsStatus, setDnsStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle")
  const [dnsError, setDnsError] = useState<string | null>(null)
  const [rdapLoading, setRdapLoading] = useState(false)
  const [enriched, setEnriched] = useState(false)
  const userModifiedNs = useRef(false)
  const userModifiedRegisteredDate = useRef(false)
  const userModifiedExpiryDate = useRef(false)

  // Single-call DNS verification + RDAP enrichment
  useEffect(() => {
    if (!debouncedFqdn || debouncedFqdn.length < 3) {
      setDnsStatus("idle")
      setDnsError(null)
      setEnriched(false)
      return
    }

    let cancelled = false
    setDnsStatus("verifying")
    setDnsError(null)
    setEnriched(false)
    setRdapLoading(true)

    lookupDomainDetails(debouncedFqdn).then((details) => {
      if (cancelled) return
      setDnsStatus("valid")
      setDnsError(null)
      setRdapLoading(false)

      // Nameservers
      if (!userModifiedNs.current && details.nameservers?.length) {
        setValue("nameservers", details.nameservers.join(", "), { shouldValidate: true })
      }

      // Registered date
      if (!userModifiedRegisteredDate.current && details.registered_date) {
        setValue("registered_date", details.registered_date, { shouldValidate: true })
      }

      // Expiry date
      if (!userModifiedExpiryDate.current && details.expiry_date) {
        setValue("expiry_date", details.expiry_date, { shouldValidate: true })
      }

      setEnriched(true)
    }).catch((err: unknown) => {
      if (cancelled) return
      setRdapLoading(false)
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
  }, [debouncedFqdn, setValue])

  const watchedRegisteredDate = watch("registered_date")
  const watchedExpiryDate = watch("expiry_date")

  // Reset state when form resets (drawer opens)
  useEffect(() => {
    if (open) {
      setDnsStatus("idle")
      setDnsError(null)
      setRdapLoading(false)
      setEnriched(false)
      userModifiedNs.current = false
      userModifiedRegisteredDate.current = false
      userModifiedExpiryDate.current = false
    }
  }, [open])

  const onFormSubmit = (data: DomainFormValues) => {
    const ns = data.nameservers
      ? data.nameservers.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined
    const nameservers = ns && ns.length > 0 ? ns : undefined

    onSubmit({
      asset_id: assetId,
      fqdn: data.fqdn.trim().toLowerCase(),
      registered_date: data.registered_date || undefined,
      expiry_date: data.expiry_date || undefined,
      auto_renew: data.auto_renew ?? true,
      nameservers,
      notes: data.notes?.trim() || undefined,
    })

    reset()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
        <DrawerHeader>
          <DrawerTitle>Create Domain</DrawerTitle>
          <DrawerDescription>Add a new domain and link it to this asset.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          {/* FQDN */}
          <div className="space-y-2">
            <Label htmlFor="domain-fqdn">
              Domain Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="domain-fqdn"
                {...register("fqdn")}
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
            {errors.fqdn?.message && <p className="text-xs text-destructive">{errors.fqdn.message}</p>}
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
            {dnsStatus === "valid" && watchedFqdn.length >= 3 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Domain resolves
              </p>
            )}
          </div>

          {/* Two-column: Registered Date + Expiry Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Registered Date</Label>
              <DatePicker
                value={watchedRegisteredDate ? new Date(watchedRegisteredDate) : null}
                onChange={(date) => {
                  userModifiedRegisteredDate.current = true
                  setValue("registered_date", format(date, "yyyy-MM-dd"), { shouldValidate: true })
                }}
                placeholder="Registered date"
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <DatePicker
                value={watchedExpiryDate ? new Date(watchedExpiryDate) : null}
                onChange={(date) => {
                  userModifiedExpiryDate.current = true
                  setValue("expiry_date", format(date, "yyyy-MM-dd"), { shouldValidate: true })
                }}
                placeholder="Expiry date"
              />
            </div>
          </div>

          {/* Auto-renew toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...register("auto_renew")}
              className="size-4 rounded border-input accent-primary"
            />
            <span>Auto-renew</span>
          </label>

          {/* Nameservers */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="domain-ns">Nameservers</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center justify-center size-3.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-help">
                      <Info className="size-3.5" />
                      <span className="sr-only">Nameserver format info</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64">
                    Enter one or more nameservers separated by commas.
                    <br />
                    Example: <kbd className="rounded-sm bg-background/20 px-1 font-mono">ns1.example.com, ns2.example.com</kbd>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {rdapLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
              {enriched && !rdapLoading && (
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              )}
            </div>
            <div className="relative">
              <Input
                id="domain-ns"
                {...register("nameservers")}
                placeholder="e.g., ns1.example.com, ns2.example.com"
                onChange={(e) => {
                  userModifiedNs.current = true
                  register("nameservers").onChange(e)
                }}
                className={rdapLoading ? "pr-10" : ""}
              />
              {rdapLoading && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {rdapLoading ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Fetching domain details...
              </p>
            ) : enriched ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Domain details auto-populated
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Separate multiple nameservers with commas.</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="domain-notes">Notes</Label>
            <textarea
              id="domain-notes"
              {...register("notes")}
              placeholder="Additional notes about this domain..."
              rows={3}
              className="h-auto w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 resize-none"
            />
          </div>

          <DrawerFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Domain"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
