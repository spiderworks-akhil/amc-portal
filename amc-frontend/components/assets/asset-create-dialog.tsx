"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Globe } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/r-select"
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
    watch,
    setValue,
    reset,
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

  const selectedType = watch("type")
  const selectedClientId = watch("client_id")

  // Reset form whenever dialog opens
  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

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
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="size-5" />
            </div>
            <div>
              <DialogTitle>Create Asset</DialogTitle>
              <DialogDescription>Add a new asset to the system.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="asset-client">
                Client <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedClientId}
                onValueChange={(value) => setValue("client_id", value)}
              >
                <SelectTrigger id="asset-client" size="sm">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id?.message && (
                <p className="text-xs text-destructive">{errors.client_id.message}</p>
              )}
            </div>

            {/* Asset Name */}
            <div className="space-y-2 sm:col-span-2">
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
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Asset Type */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="asset-type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedType}
                onValueChange={(value) => setValue("type", value)}
              >
                <SelectTrigger id="asset-type" size="sm">
                  <SelectValue placeholder="Select asset type..." />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type?.message && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            {/* Primary URL */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="asset-url">Primary URL</Label>
              <Input
                id="asset-url"
                type="url"
                {...register("primary_url")}
                placeholder="https://example.com"
              />
              {errors.primary_url?.message && (
                <p className="text-xs text-destructive">{errors.primary_url.message}</p>
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
                <p className="text-xs text-destructive">{errors.primary_contact_email.message}</p>
              )}
            </div>
          </div>

          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
