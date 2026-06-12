"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Info, Loader2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/r-select"
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
})
type ServerFormValues = z.infer<typeof serverSchema>

interface CreateServerFormProps {
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
  }) => void
  isPending: boolean
  providers: Provider[]
}

const CURRENCIES = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "INR", label: "INR" },
]

export function CreateServerForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  providers,
}: CreateServerFormProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ServerFormValues>({
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
    },
  })

  // Reset form whenever drawer opens
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const onFormSubmit = (data: ServerFormValues) => {
    const ips = data.ip_addresses
      ? data.ip_addresses.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    // Only send ip_addresses when there are actual IPs — empty array causes jsonb issues
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
    })

    reset()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
        <DrawerHeader>
          <DrawerTitle>Create Server</DrawerTitle>
          <DrawerDescription>Add a new server and link it to this asset.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="server-provider">
              Provider <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="provider_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="server-provider" size="sm">
                    <SelectValue placeholder="Select a provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.provider_id?.message && <p className="text-xs text-destructive">{errors.provider_id.message}</p>}
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="server-label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input id="server-label" {...register("label")} placeholder="e.g., Production Web Server" autoFocus />
            {errors.label?.message && <p className="text-xs text-destructive">{errors.label.message}</p>}
          </div>

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
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label htmlFor="server-region">Region</Label>
            <Input id="server-region" {...register("region")} placeholder="e.g., us-east-1, EU West" />
          </div>

          {/* OS */}
          <div className="space-y-2">
            <Label htmlFor="server-os">Operating System</Label>
            <Input id="server-os" {...register("operating_system")} placeholder="e.g., Ubuntu 22.04" />
          </div>

          {/* Panel URL */}
          <div className="space-y-2">
            <Label htmlFor="server-panel">Panel URL</Label>
            <Input id="server-panel" type="url" {...register("panel_url")} placeholder="https://panel.example.com" />
            {errors.panel_url?.message && <p className="text-xs text-destructive">{errors.panel_url.message}</p>}
          </div>

          {/* Two-column: Monthly Cost + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="server-cost">Monthly Cost</Label>
              <Input id="server-cost" type="number" step="0.01" min="0" {...register("monthly_cost")} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="server-currency">Currency</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="server-currency" size="sm">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Renewal Date */}
          <div className="space-y-2">
            <Label htmlFor="server-renewal">Renewal Date</Label>
            <Input id="server-renewal" type="date" {...register("renewal_date")} />
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
              {isPending ? "Creating..." : "Create & Link Server"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
