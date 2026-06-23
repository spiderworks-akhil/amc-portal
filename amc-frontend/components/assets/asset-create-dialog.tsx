"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Loader2, Server, CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type { ClientListItem, Contact as ContactType } from "@/types/api"
import { SmoothSelect } from "../ui/smooth-select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useClient } from "@/hooks/use-clients"
import { useServers } from "@/hooks/use-servers"
import { cn } from "@/lib/utils"

interface AssetCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    type: string
    primary_contact_name?: string
    primary_contact_email?: string
    notes?: string
    client_id?: string
    server_ids?: string[]
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
      primary_contact_name: "",
      primary_contact_email: "",
      notes: "",
    },
  })
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([])
  const [serverSearch, setServerSearch] = useState("")
  const [serverPopoverOpen, setServerPopoverOpen] = useState(false)
  const { data: serversData, isLoading: serversLoading } = useServers()

  const serverOptions = useMemo(() => {
    const allServers = serversData?.data ?? []
    if (!serverSearch) return allServers
    const q = serverSearch.toLowerCase()
    return allServers.filter((s) => s.label.toLowerCase().includes(q))
  }, [serversData, serverSearch])

  const toggleServer = (serverId: string) => {
    setSelectedServerIds((prev) =>
      prev.includes(serverId) ? prev.filter((id) => id !== serverId) : [...prev, serverId]
    )
  }

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
        primary_contact_name: "",
        primary_contact_email: "",
        notes: "",
      })
      setSelectedServerIds([])
      setServerSearch("")
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
      primary_contact_name: data.primary_contact_name || undefined,
      primary_contact_email: data.primary_contact_email || undefined,
      notes: data.notes || undefined,
      server_ids: selectedServerIds.length > 0 ? selectedServerIds : undefined,
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-h-screen overflow-y-auto sm:max-w-[458px]">
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

          {/* Servers */}
          <div className="space-y-2">
            <Label>Servers</Label>
            <Popover open={serverPopoverOpen} onOpenChange={setServerPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={serverPopoverOpen}
                  className={cn(
                    "flex h-10 w-full items-center gap-2 rounded-lg border border-input px-3 text-sm transition-colors",
                    "hover:border-ring/40",
                    "focus:border-ring focus:ring-1 focus:ring-ring/25 focus:outline-none",
                    selectedServerIds.length === 0 && "text-muted-foreground",
                  )}
                >
                  <Server className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-left">
                    {selectedServerIds.length === 0
                      ? "Select servers..."
                      : `${selectedServerIds.length} server${selectedServerIds.length !== 1 ? "s" : ""} selected`
                    }
                  </span>
                  {selectedServerIds.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedServerIds([])
                      }}
                      className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Clear selection"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  )}
                  <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", serverPopoverOpen && "rotate-180")} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] border border-input p-0 shadow-md overflow-hidden"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="border-b border-input px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-4 shrink-0 opacity-50" />
                    <input
                      placeholder="Search servers..."
                      value={serverSearch}
                      onChange={(e) => setServerSearch(e.target.value)}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {serversLoading ? (
                    <div className="py-3 text-center text-sm text-muted-foreground">Loading servers...</div>
                  ) : serverOptions.length === 0 ? (
                    <div className="py-3 text-center text-sm text-muted-foreground">No servers found.</div>
                  ) : (
                    serverOptions.map((server) => {
                      const isSelected = selectedServerIds.includes(server.id)
                      return (
                        <div
                          key={server.id}
                          onClick={() => toggleServer(server.id)}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                            isSelected && "bg-accent text-accent-foreground",
                          )}
                        >
                          <CheckIcon className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                          <span className="truncate">{server.label}</span>
                          {server.region && (
                            <span className="text-xs text-muted-foreground ml-auto shrink-0">{server.region}</span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
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
