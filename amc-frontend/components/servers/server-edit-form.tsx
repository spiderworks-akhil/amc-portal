"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { SmoothSelect } from "@/components/ui/smooth-select"
import DatePicker from "@/components/date-picker"
import type { Provider } from "@/types/api"

const serverSchema = z.object({
  label: z.string().min(1, "Label is required"),
  provider_id: z.string().min(1, "Provider is required"),
  ip_addresses: z.string().optional(),
  region: z.string().optional(),
  operating_system: z.string().optional(),
  panel_url: z.string().optional(),
  monthly_cost: z.string().optional(),
  currency: z.string().optional(),
  renewal_date: z.string().optional(),
  notes: z.string().optional(),
})
type ServerFormValues = z.infer<typeof serverSchema>

const CURRENCIES = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "INR", label: "INR" },
  { value: "AUD", label: "AUD" },
  { value: "CAD", label: "CAD" },
]

interface ServerEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    label?: string
    provider_id?: string
    ip_addresses?: string[]
    region?: string
    operating_system?: string
    panel_url?: string
    monthly_cost?: number
    currency?: string
    renewal_date?: string
    notes?: string
  }) => void
  onDelete: () => void
  isPending: boolean
  isDeleting: boolean
  providers: Provider[]
  server: {
    label: string
    provider_id: string
    ip_addresses: string[]
    region?: string | null
    operating_system?: string | null
    panel_url?: string | null
    monthly_cost?: string | null
    currency?: string | null
    renewal_date?: string | null
    notes?: string | null
  }
}

export function ServerEditForm({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
  providers,
  server,
}: ServerEditFormProps) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ServerFormValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      label: server.label ?? "",
      provider_id: server.provider_id ?? "",
      ip_addresses: (server.ip_addresses ?? []).join(", "),
      region: server.region ?? "",
      operating_system: server.operating_system ?? "",
      panel_url: server.panel_url ?? "",
      monthly_cost: server.monthly_cost ?? "",
      currency: server.currency ?? "USD",
      renewal_date: server.renewal_date ?? "",
      notes: server.notes ?? "",
    },
  })

  useEffect(() => {
    if (open) reset({
      label: server.label ?? "",
      provider_id: server.provider_id ?? "",
      ip_addresses: (server.ip_addresses ?? []).join(", "),
      region: server.region ?? "",
      operating_system: server.operating_system ?? "",
      panel_url: server.panel_url ?? "",
      monthly_cost: server.monthly_cost ?? "",
      currency: server.currency ?? "USD",
      renewal_date: server.renewal_date ?? "",
      notes: server.notes ?? "",
    })
  }, [open, server, reset])

  const watchedRenewalDate = watch("renewal_date")

  const onFormSubmit = (data: ServerFormValues) => {
    const ips = data.ip_addresses
      ? data.ip_addresses.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    onSubmit({
      label: data.label?.trim() || undefined,
      provider_id: data.provider_id || undefined,
      ip_addresses: ips && ips.length > 0 ? ips : undefined,
      region: data.region?.trim() || undefined,
      operating_system: data.operating_system?.trim() || undefined,
      panel_url: data.panel_url?.trim() || undefined,
      monthly_cost: data.monthly_cost ? Number(data.monthly_cost) : undefined,
      currency: data.currency || undefined,
      renewal_date: data.renewal_date || undefined,
      notes: data.notes?.trim() || undefined,
    })
  }

  const providerOptions = providers.map((p) => ({ value: p.id, label: p.name }))

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
        <DrawerHeader>
          <DrawerTitle>Edit Server</DrawerTitle>
          <DrawerDescription>Update this server&apos;s information.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="srv-label">Server Label</Label>
            <Input
              id="srv-label"
              {...register("label")}
              placeholder="e.g., Production Web Server"
              autoFocus
            />
            {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label>Provider</Label>
            <SmoothSelect
              options={providerOptions}
              value={watch("provider_id")}
              onChange={(value) => setValue("provider_id", value, { shouldValidate: true })}
              placeholder="Select provider..."
              className="w-full"
            />
            {errors.provider_id && <p className="text-xs text-destructive">{errors.provider_id.message}</p>}
          </div>

          {/* IP Addresses */}
          <div className="space-y-2">
            <Label htmlFor="srv-ips">IP Addresses</Label>
            <Input
              id="srv-ips"
              {...register("ip_addresses")}
              placeholder="e.g., 192.168.1.1, 10.0.0.1"
            />
            <p className="text-xs text-muted-foreground">Separate multiple IPs with commas.</p>
          </div>

          {/* Region + OS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="srv-region">Region</Label>
              <Input
                id="srv-region"
                {...register("region")}
                placeholder="e.g., US-East"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="srv-os">Operating System</Label>
              <Input
                id="srv-os"
                {...register("operating_system")}
                placeholder="e.g., Ubuntu 22.04"
              />
            </div>
          </div>

          {/* Panel URL */}
          <div className="space-y-2">
            <Label htmlFor="srv-panel">Panel URL</Label>
            <Input
              id="srv-panel"
              {...register("panel_url")}
              placeholder="e.g., https://panel.example.com"
            />
          </div>

          {/* Cost + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="srv-cost">Monthly Cost</Label>
              <Input
                id="srv-cost"
                {...register("monthly_cost")}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <SmoothSelect
                options={CURRENCIES}
                value={watch("currency") || "USD"}
                onChange={(value) => setValue("currency", value)}
                className="w-full"
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
            <Label htmlFor="srv-notes">Notes</Label>
            <Textarea
              id="srv-notes"
              {...register("notes")}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <DrawerFooter className="mt-auto flex-row-reverse">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="destructive" onClick={onDelete} disabled={isDeleting} className="mr-auto">
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
