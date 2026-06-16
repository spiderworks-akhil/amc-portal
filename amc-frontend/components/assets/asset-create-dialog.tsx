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
import type { ClientListItem, Contact as ContactType } from "@/types/api"
import { SmoothSelect } from "../ui/smooth-select"
import { useClient } from "@/hooks/use-clients"

interface AssetCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    type: string
    primary_url?: string
    primary_contact_name?: string
    primary_contact_email?: string
    notes?: string
    client_id?: string
  }) => void
  isPending: boolean
  types: Array<{ value: string; label: string }>
  /** Pre-selected client ID (used on client detail page). When provided, hides client selector. */
  clientId?: string
  /** Client list for the dropdown (only needed when clientId is not provided). */
  clients?: ClientListItem[]
  /** Pre-loaded contacts (used on client detail page). When provided, skips fetching. */
  contacts?: ContactType[]
}

const assetSchema = z.object({
  client_id: z.string().optional(),
  name: z.string().min(1, "Asset name is required").max(255),
  type: z.string().min(1, "Asset type is required"),
  primary_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  primary_contact_name: z.string().max(255).optional(),
  primary_contact_email: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  notes: z.string().max(5000).optional(),
})

type AssetFormValues = z.infer<typeof assetSchema>

export function AssetCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  types,
  clientId,
  clients = [],
  contacts: contactsProp,
}: AssetCreateDialogProps) {
  const hasClientSelector = !clientId

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(
      hasClientSelector
        ? assetSchema.extend({ client_id: z.string().min(1, "Client is required") })
        : assetSchema
    ),
    defaultValues: {
      client_id: clientId ?? "",
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

  // Fetch contacts from API only when no pre-loaded contacts and we have a client ID
  const effectiveClientId = clientId || selectedClientId || null
  const { data: clientDetail } = useClient(
    contactsProp ? null : effectiveClientId
  )
  const contacts: ContactType[] = contactsProp ?? clientDetail?.contacts ?? []

  const selectedContact =
    contacts.find(
      (c) =>
        c.name === watch("primary_contact_name") &&
        (c.email || "") === (watch("primary_contact_email") || "")
    ) ?? null

  useEffect(() => {
    if (open) {
      reset({
        client_id: clientId ?? "",
        name: "",
        type: "",
        primary_url: "",
        primary_contact_name: "",
        primary_contact_email: "",
        notes: "",
      })
    }
  }, [open, reset, clientId])

  // Clear contact when client changes (only for the client selector mode)
  useEffect(() => {
    if (hasClientSelector && open) {
      setValue("primary_contact_name", "")
      setValue("primary_contact_email", "")
    }
  }, [selectedClientId, open, setValue, hasClientSelector])

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
      client_id: clientId ?? (data.client_id || undefined),
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
            {clientId
              ? "Add a new asset for this client."
              : "Add a new asset to the system."}
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-1 flex-col gap-5 p-4 pt-6"
        >
          {/* Client Selector (only when no pre-selected client) */}
          {hasClientSelector && (
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
          )}

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

            <SmoothSelect
              options={typeOptions}
              value={selectedType || undefined}
              onChange={(value) =>
                setValue("type", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              placeholder="Select asset type..."
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

          {/* Primary Contact */}
          <div className="space-y-2">
            <Label>Primary Contact</Label>

            <SmoothSelect
              placeholder="Select a contact..."
              value={selectedContact?.id}
              options={contacts.map((contact) => ({
                value: contact.id,
                label: contact.email
                  ? `${contact.name} (${contact.email})`
                  : contact.name,
              }))}
              onChange={(value) => {
                const contact = contacts.find((c) => c.id === value)

                setValue("primary_contact_name", contact?.name ?? "", {
                  shouldDirty: true,
                })

                setValue("primary_contact_email", contact?.email ?? "", {
                  shouldDirty: true,
                })
              }}
            />

            {errors.primary_contact_name?.message && (
              <p className="text-xs text-destructive">
                {errors.primary_contact_name.message}
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
