"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { SmoothSelect } from "@/components/ui/smooth-select"

import type { Contact as ContactType } from "@/types/api"

const assetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  primary_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  primary_contact_name: z.string().optional(),
  primary_contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  status: z.string().optional(),
  monitoring_enabled: z.boolean().optional(),
  notes: z.string().optional(),
})
type AssetFormValues = z.infer<typeof assetSchema>

export function AssetEditForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  asset,
  contacts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; primary_url?: string; primary_contact_name?: string; primary_contact_email?: string; status?: string; monitoring_enabled?: boolean; notes?: string }) => void
  isPending: boolean
  asset: { name: string; primary_url?: string | null; primary_contact_name?: string | null; primary_contact_email?: string | null; status?: string | null; monitoring_enabled?: boolean | null; notes?: string | null }
  contacts: ContactType[]
}) {
  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: asset.name ?? "",
      primary_url: asset.primary_url ?? "",
      primary_contact_name: asset.primary_contact_name ?? "",
      primary_contact_email: asset.primary_contact_email ?? "",
      status: asset.status ?? "live",
      monitoring_enabled: asset.monitoring_enabled ?? false,
      notes: asset.notes ?? "",
    },
  })

  const selectedContact = contacts.find(
    (c) => c.name === watch("primary_contact_name") && (c.email || "") === (watch("primary_contact_email") || "")
  ) ?? null

  // Sync form when asset prop changes or drawer opens
  useEffect(() => {
    if (open) reset({
      name: asset.name ?? "",
      primary_url: asset.primary_url ?? "",
      primary_contact_name: asset.primary_contact_name ?? "",
      primary_contact_email: asset.primary_contact_email ?? "",
      status: asset.status ?? "live",
      monitoring_enabled: asset.monitoring_enabled ?? false,
      notes: asset.notes ?? "",
    })
  }, [open, asset, reset])

  const onFormSubmit = (data: AssetFormValues) => {
    onSubmit({
      name: data.name.trim(),
      primary_url: data.primary_url?.trim() || undefined,
      primary_contact_name: data.primary_contact_name?.trim() || undefined,
      primary_contact_email: data.primary_contact_email?.trim() || undefined,
      status: data.status || undefined,
      monitoring_enabled: data.monitoring_enabled,
      notes: data.notes?.trim() || undefined,
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-[458px]">
        <DrawerHeader>
          <DrawerTitle>Edit Asset</DrawerTitle>
          <DrawerDescription>Update this asset&apos;s information.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="asset-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="asset-name" {...register("name")} placeholder="Client Website" autoFocus />
            {errors.name?.message && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-url">Primary URL</Label>
            <Input id="asset-url" type="url" {...register("primary_url")} placeholder="https://example.com" />
            {errors.primary_url?.message && <p className="text-xs text-destructive">{errors.primary_url.message}</p>}
          </div>
          <div className="space-y-2">
  <Label>Primary Contact</Label>

  <SmoothSelect
    options={contacts.map(contact => ({
      value: contact.id,
      label: contact.email ? `${contact.name} (${contact.email})` : contact.name,
    }))}
    value={selectedContact?.id ?? undefined}
    placeholder="Select a contact..."
    onChange={(value) => {
      const contact = contacts.find((c) => c.id === value)
      setValue("primary_contact_name", contact?.name ?? "")
      setValue("primary_contact_email", contact?.email ?? "")
    }}
  />
</div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <SmoothSelect
                  options={[
                    { value: "live", label: "Live" },
                    { value: "staging", label: "Staging" },
                    { value: "development", label: "Development" },
                    { value: "parked", label: "Parked" },
                  ]}
                  value={field.value || undefined}
                  placeholder="Select status..."
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...register("monitoring_enabled")}
              className="size-4 rounded border-input accent-primary"
            />
            <span>Monitoring enabled</span>
          </label>
          <div className="space-y-2">
            <Label htmlFor="asset-notes">Notes</Label>
            <textarea
              id="asset-notes"
              {...register("notes")}
              placeholder="Additional notes about this asset..."
              rows={4}
              className="h-auto w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 resize-none"
            />
          </div>

          <DrawerFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
