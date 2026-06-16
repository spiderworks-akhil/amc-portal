"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type { ClientListItem } from "@/types/api"

const assetSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  name: z.string().min(1, "Asset name is required").max(255),
  type: z.string().min(1, "Asset type is required"),
  primary_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  primary_contact_name: z.string().max(255).optional(),
  primary_contact_email: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  notes: z.string().max(5000).optional(),
})

type AssetFormValues = z.infer<typeof assetSchema>

interface AssetCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AssetFormValues) => void
  isPending: boolean
  types: Array<{ value: string; label: string }>
  clients: ClientListItem[]
}

export function AssetCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  types,
  clients,
}: AssetCreateDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      client_id: "",
      name: "",
      type: "",
      primary_url: "",
      primary_contact_name: "",
      primary_contact_email: "",
      notes: "",
    },
  })

  const selectedClientId = watch("client_id")
  const selectedType = watch("type")

  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.company ? `${client.name} (${client.company})` : client.name,
  }))

  const typeOptions = types.map((t) => ({
    value: t.value,
    label: t.label,
  }))

  const onFormSubmit = (data: AssetFormValues) => {
    onSubmit({
      client_id: data.client_id,
      name: data.name,
      type: data.type,
      primary_url: data.primary_url || undefined,
      primary_contact_name: data.primary_contact_name || undefined,
      primary_contact_email: data.primary_contact_email || undefined,
      notes: data.notes || undefined,
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-h-screen overflow-y-auto sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Create Asset</DrawerTitle>
          <DrawerDescription>
            Add a new asset to the system.
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-1 flex-col gap-5 p-4 pt-6"
        >
          {/* Client */}
          <div className="space-y-2">
            <Label htmlFor="client-select">
              Client <span className="text-destructive">*</span>
            </Label>

            <SearchableSelect
              id="client-select"
              options={clientOptions}
              value={selectedClientId}
              onChange={(value) =>
                setValue("client_id", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              placeholder="Select client..."
              searchPlaceholder="Search clients..."
              emptyText="No clients found."
            />

            {errors.client_id?.message && (
              <p className="text-xs text-destructive">
                {errors.client_id.message}
              </p>
            )}
          </div>

          {/* Asset Name */}
          <div className="space-y-2">
            <Label htmlFor="asset-name">
              Name <span className="text-destructive">*</span>
            </Label>

            <Input
              id="asset-name"
              {...register("name")}
              placeholder="e.g., Client Website, Mobile App"
              autoFocus
            />

            {errors.name?.message && (
              <p className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Asset Type */}
          <div className="space-y-2">
            <Label htmlFor="type-select">
              Type <span className="text-destructive">*</span>
            </Label>

            <SearchableSelect
              id="type-select"
              options={typeOptions}
              value={selectedType}
              onChange={(value) =>
                setValue("type", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              placeholder="Select asset type..."
              searchPlaceholder="Search types..."
              emptyText="No types found."
            />

            {errors.type?.message && (
              <p className="text-xs text-destructive">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Primary URL */}
          <div className="space-y-2">
            <Label htmlFor="asset-url">Primary URL</Label>

            <Input
              id="asset-url"
              type="url"
              {...register("primary_url")}
              placeholder="https://example.com"
            />

            {errors.primary_url?.message && (
              <p className="text-xs text-destructive">
                {errors.primary_url.message}
              </p>
            )}
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="asset-contact-name">Contact Name</Label>

            <Input
              id="asset-contact-name"
              {...register("primary_contact_name")}
              placeholder="John Doe"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="asset-contact-email">Contact Email</Label>

            <Input
              id="asset-contact-email"
              type="email"
              {...register("primary_contact_email")}
              placeholder="john@example.com"
            />

            {errors.primary_contact_email?.message && (
              <p className="text-xs text-destructive">
                {errors.primary_contact_email.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="asset-notes">Notes</Label>

            <textarea
              id="asset-notes"
              {...register("notes")}
              placeholder="Additional notes about this asset..."
              rows={3}
              className="h-auto w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"
            />

            {errors.notes?.message && (
              <p className="text-xs text-destructive">
                {errors.notes.message}
              </p>
            )}
          </div>

          <DrawerFooter className="mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Asset"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}