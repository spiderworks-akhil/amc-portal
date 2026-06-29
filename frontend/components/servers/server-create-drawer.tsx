"use client"

import { useEffect, useRef, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "@/hooks/use-debounce"
import { useDetectServerProvider } from "@/hooks/use-servers"
import type { DetectProviderResult } from "@/hooks/use-servers"
import { useCreateProvider } from "@/hooks/use-create-provider"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Check, Info, Loader2 } from "lucide-react"
import DatePicker from "@/components/date-picker"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SmoothSelect } from "@/components/ui/smooth-select"
import type { Provider } from "@/types/api"

const serverSchema = z.object({
  provider_id: z.string().min(1, "Provider is required"),
  label: z.string().min(1, "Label is required").max(255),
  ip_addresses: z.string().optional(),
  region: z.string().optional(),
  operating_system: z.string().optional(),
  panel_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  monthly_cost: z.string().optional(),
  currency: z.string().optional(),
  renewal_date: z.string().optional(),
  notes: z.string().optional(),
  owner: z.string().optional(),
})
type ServerFormValues = z.infer<typeof serverSchema>

const CURRENCIES = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "INR", label: "INR" },
]

function hostnameToLabel(hostname: string): string {
  return hostname
    .split(".")
    .slice(-2, -1)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") + " Panel"
}

interface ServerCreateDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    provider_id: string
    label: string
    ip_addresses?: string[]
    region?: string
    operating_system?: string
    panel_url?: string
    monthly_cost?: number
    currency?: string
    renewal_date?: string
    notes?: string
    owner?: "SpiderWorks" | "client" | "thirdparty"
  }) => void
  isPending: boolean
  /** Pre-selected project ID — hides project linking (used from project detail page) */
  projectId?: string
  /** Providers list (passed from parent to avoid refetch) */
  providers?: Provider[]
}

export function ServerCreateDrawer({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  providers = [],
}: ServerCreateDrawerProps) {
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<ServerFormValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      provider_id: "",
      label: "",
      ip_addresses: "",
      region: "",
      operating_system: "",
      panel_url: "",
      monthly_cost: "",
      currency: "USD",
      renewal_date: "",
      notes: "",
      owner: "client",
    },
  })

  const detectProvider = useDetectServerProvider()
  const createProvider = useCreateProvider()
  const queryClient = useQueryClient()
  const [detectedOrg, setDetectedOrg] = useState<string | null>(null)
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null)
  const [detectedCity, setDetectedCity] = useState<string | null>(null)
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null)
  const [detectingProvider, setDetectingProvider] = useState(false)
  const [creatingProvider, setCreatingProvider] = useState(false)
  const [extraProviders, setExtraProviders] = useState<Provider[]>([])
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null)
  const userModifiedProvider = useRef(false)
  const userModifiedRegion = useRef(false)
  const userModifiedLabel = useRef(false)
  const createdOrgsRef = useRef<Set<string>>(new Set())

  const watchedIpAddresses = watch("ip_addresses")
  const watchedPanelUrl = watch("panel_url")
  const debouncedIps = useDebounce(watchedIpAddresses ?? "", 800)
  const debouncedPanelUrl = useDebounce(watchedPanelUrl ?? "", 800)

  // Shared detection logic used by both IP and panel URL effects
  const handleDetectionResult = useRef<(result: DetectProviderResult) => void>(() => {})
  handleDetectionResult.current = (result: DetectProviderResult) => {
    setDetectionMessage(null)

    if (result.region) setDetectedRegion(result.region)
    if (result.city) setDetectedCity(result.city)
    if (result.country) setDetectedCountry(result.country)

    if (result.detected && result.organization) {
      setDetectedOrg(result.organization)
      if (!userModifiedLabel.current) {
        setValue("label", result.organization, { shouldValidate: true })
      }
      if (result.provider_id && !userModifiedProvider.current) {
        setValue("provider_id", result.provider_id, { shouldValidate: true })
      } else if (!result.provider_id && !createdOrgsRef.current.has(result.organization)) {
        createdOrgsRef.current.add(result.organization)
        setCreatingProvider(true)
        createProvider.mutate(
          { name: result.organization, type: "hosting" },
          {
            onSuccess: (response) => {
              const newProvider = response.data
              if (newProvider?.id && !userModifiedProvider.current) {
                setValue("provider_id", newProvider.id, { shouldValidate: true })
                setExtraProviders((prev) => [...prev, newProvider as Provider])
                queryClient.invalidateQueries({ queryKey: ["providers"] })
              }
              setCreatingProvider(false)
            },
            onError: () => {
              setCreatingProvider(false)
            },
          }
        )
      }
    } else if (!result.detected && result.message) {
      setDetectionMessage(result.message)
    }

    if (!userModifiedRegion.current) {
      const regionValue = result.region || result.city || result.country
      if (regionValue) {
        setValue("region", regionValue, { shouldValidate: true })
      }
    }
  }

  // Detect provider from IP address
  useEffect(() => {
    if (!debouncedIps || debouncedIps.length < 7) {
      setDetectedOrg(null)
      setDetectedRegion(null)
      setDetectedCity(null)
      setDetectedCountry(null)
      setDetectionMessage(null)
      return
    }

    const firstIp = debouncedIps.split(",")[0].trim()
    if (!firstIp) {
      setDetectedOrg(null)
      setDetectedRegion(null)
      setDetectedCity(null)
      setDetectedCountry(null)
      setDetectionMessage(null)
      return
    }

    let cancelled = false
    setDetectingProvider(true)
    setDetectedOrg(null)
    setDetectedRegion(null)
    setDetectedCity(null)
    setDetectedCountry(null)

    detectProvider.mutate(firstIp, {
      onSuccess: (result: DetectProviderResult) => {
        if (cancelled) return
        handleDetectionResult.current(result)
        setDetectingProvider(false)
      },
      onError: () => {
        if (cancelled) return
        setDetectingProvider(false)
      },
    })

    return () => { cancelled = true }
  }, [debouncedIps])

  // Detect provider from panel URL hostname
  useEffect(() => {
    if (!debouncedPanelUrl || debouncedPanelUrl.length < 10) {
      return
    }

    let hostname: string | null = null
    try {
      hostname = new URL(debouncedPanelUrl).hostname
    } catch {
      return
    }
    if (!hostname || hostname.length < 4 || hostname === "localhost") {
      setDetectionMessage(null)
      return
    }

    let cancelled = false
    setDetectingProvider(true)
    setDetectedOrg(null)
    setDetectedRegion(null)
    setDetectedCity(null)
    setDetectedCountry(null)

    const labelFromHostname = hostnameToLabel(hostname)

    detectProvider.mutate(hostname, {
      onSuccess: (result: DetectProviderResult) => {
        if (cancelled) return
        handleDetectionResult.current(result)
        if (labelFromHostname && !userModifiedLabel.current) {
          setValue("label", labelFromHostname, { shouldValidate: true })
        }
        setDetectingProvider(false)
      },
      onError: () => {
        if (cancelled) return
        setDetectingProvider(false)
      },
    })

    return () => { cancelled = true }
  }, [debouncedPanelUrl])

  // Reset form whenever drawer opens
  useEffect(() => {
    if (open) {
      reset()
      setDetectedOrg(null)
      setDetectedRegion(null)
      setDetectedCity(null)
      setDetectedCountry(null)
      setDetectingProvider(false)
      setCreatingProvider(false)
      setDetectionMessage(null)
      userModifiedProvider.current = false
      userModifiedRegion.current = false
      userModifiedLabel.current = false
      createdOrgsRef.current = new Set()
      setExtraProviders([])
    }
  }, [open, reset])

  const watchedRenewalDate = watch("renewal_date")

  const onFormSubmit = (data: ServerFormValues) => {
    const ips = data.ip_addresses
      ? data.ip_addresses.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    const ipAddresses = ips && ips.length > 0 ? ips : undefined

    onSubmit({
      provider_id: data.provider_id,
      label: data.label.trim(),
      ip_addresses: ipAddresses,
      region: data.region?.trim() || undefined,
      operating_system: data.operating_system?.trim() || undefined,
      panel_url: data.panel_url?.trim() || undefined,
      monthly_cost: data.monthly_cost ? Number(data.monthly_cost) : undefined,
      currency: data.currency?.trim() || "USD",
      renewal_date: data.renewal_date || undefined,
      notes: data.notes?.trim() || undefined,
      owner: (data.owner as "SpiderWorks" | "client" | "thirdparty") || undefined,
    })

    reset()
  }

  const allProviders = [...providers, ...extraProviders]
  const providerOptions = allProviders.map((p) => ({ value: p.id, label: p.name }))

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-[458px] overflow-y-auto max-h-screen">
        <DrawerHeader>
          <DrawerTitle>Create Server</DrawerTitle>
          <DrawerDescription>Add a new hosting server to the inventory.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
            {/* IP Addresses */}
            <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="server-ips">IP Addresses</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center justify-center size-3.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-help">
                      <Info className="size-3.5" />
                      <span className="sr-only">IP format info</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64">
                    Enter one or more IP addresses separated by commas.
                    <br />
                    Example: <kbd className="rounded-sm bg-background/20 px-1 font-mono">10.0.0.1, 10.0.0.2</kbd>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input id="server-ips" {...register("ip_addresses")} placeholder="e.g., 10.0.0.1, 10.0.0.2" />
            <p className="text-xs text-muted-foreground">
              Separate multiple IPs with commas. IPv4 and IPv6 are both supported.
            </p>
            {detectingProvider && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Detecting provider from IP...
              </div>
            )}
            {creatingProvider && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Creating provider &quot;{detectedOrg}&quot;...
              </div>
            )}
            {!detectingProvider && !creatingProvider && detectedOrg && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500">
                <Check className="size-3.5" />
                Detected: {detectedOrg}
              </div>
            )}
          </div>

              <div className="space-y-2">
            <Label htmlFor="server-panel">Panel URL</Label>
            <Input id="server-panel" type="url" {...register("panel_url")} placeholder="https://panel.example.com" />
            {errors.panel_url?.message && <p className="text-xs text-destructive">{errors.panel_url.message}</p>}
          </div>
          {/* Provider */}
          {/* <div className="space-y-2">
            <Label>
              Provider <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="provider_id"
              control={control}
              render={({ field }) => (
                <SmoothSelect
                  options={providerOptions}
                  value={field.value}
                  onChange={(value) => {
                    userModifiedProvider.current = true
                    setDetectedOrg(null)
                    field.onChange(value)
                  }}
                  placeholder="Select a provider..."
                  className="w-full"
                />
              )}
            />
            {errors.provider_id?.message && <p className="text-xs text-destructive">{errors.provider_id.message}</p>}
          </div> */}

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="server-label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="server-label"
              {...register("label", {
                onChange: () => { userModifiedLabel.current = true },
              })}
              placeholder="e.g., Production Web Server"
              autoFocus
            />
            {errors.label?.message && <p className="text-xs text-destructive">{errors.label.message}</p>}
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label>Owner</Label>
            <Controller
              name="owner"
              control={control}
              render={({ field }) => (
                <SmoothSelect
                  options={[
                    { value: "client", label: "Client" },
                    { value: "SpiderWorks", label: "SpiderWorks" },
                    { value: "thirdparty", label: "Third Party" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select owner..."
                  className="w-full"
                />
              )}
            />
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label htmlFor="server-region">Region</Label>
            <Input
              id="server-region"
              {...register("region", {
                onChange: () => { userModifiedRegion.current = true },
              })}
              placeholder="e.g., us-east-1, EU West"
            />
            {!detectingProvider && (detectedRegion || detectedCity || detectedCountry) && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500">
                <Check className="size-3.5" />
                Detected: {[detectedCity, detectedRegion, detectedCountry].filter(Boolean).join(", ")}
              </div>
            )}
            {!detectingProvider && detectionMessage && !detectedOrg && !detectedRegion && (
              <p className="text-xs text-muted-foreground">{detectionMessage}</p>
            )}
          </div>

          {/* OS */}
          <div className="space-y-2">
            <Label htmlFor="server-os">Operating System</Label>
            <Input id="server-os" {...register("operating_system")} placeholder="e.g., Ubuntu 22.04" />
          </div>

      

          {/* Two-column: Monthly Cost + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="server-cost">Monthly Cost</Label>
              <Input id="server-cost" type="number" step="0.01" min="0" {...register("monthly_cost")} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <SmoothSelect
                    options={CURRENCIES}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Currency"
                    className="w-full"
                  />
                )}
              />
            </div>
          </div>

          {/* Renewal Date */}
          <div className="space-y-2">
            <Label>Renewal Date</Label>
            <DatePicker
              value={watchedRenewalDate ? new Date(watchedRenewalDate) : null}
              onChange={(date) =>
                setValue("renewal_date", format(date, "yyyy-MM-dd"), { shouldValidate: true })
              }
              placeholder="Renewal date"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="server-notes">Notes</Label>
            <textarea
              id="server-notes"
              {...register("notes")}
              placeholder="Additional notes..."
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
              {isPending ? "Creating..." : "Create Server"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
