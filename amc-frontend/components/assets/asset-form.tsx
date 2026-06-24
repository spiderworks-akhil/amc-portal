"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, Controller } from "react-hook-form"
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
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxEmpty,
  ComboboxList,
  ComboboxGroup,
  ComboboxItem,
} from "@/components/kibo-ui/combobox"
import { SmoothSelect } from "@/components/ui/smooth-select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useClient, useClients } from "@/hooks/use-clients"
import { useServers } from "@/hooks/use-servers"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import type { Contact as ContactType } from "@/types/api"

// ── Form value type (wide enough for both modes) ──

interface AssetFormValues {
  name: string
  type?: string
  client_id?: string
  primary_contact_name?: string
  primary_contact_email?: string
  notes?: string
  status?: string
  monitoring_enabled?: boolean
}

// ── Schema factory ──

function buildSchema(mode: "create" | "edit", hasClientSelector: boolean) {
  const base = {
    name: z.string().min(1, "Asset name is required").max(255),
    primary_contact_name: z.string().max(255).optional(),
    primary_contact_email: z.string().email("Must be a valid email").or(z.literal("")).optional(),
    notes: z.string().max(5000).optional(),
  }

  if (mode === "create") {
    return z.object({
      ...base,
      client_id: hasClientSelector
        ? z.string().min(1, "Client is required")
        : z.string().optional(),
      type: z.string().min(1, "Asset type is required"),
    })
  }

  return z.object({
    ...base,
    status: z.string().optional(),
    monitoring_enabled: z.boolean().optional(),
  })
}

// ── Props ──

type CreateSubmit = (data: {
  name: string
  type: string
  primary_contact_name?: string
  primary_contact_email?: string
  notes?: string
  client_id?: string
  server_ids?: string[]
}) => void

type EditSubmit = (data: {
  name: string
  primary_contact_name?: string
  primary_contact_email?: string
  status?: string
  monitoring_enabled?: boolean
  notes?: string
}) => void

type AssetFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  contacts?: ContactType[]
} & (
  | {
      mode: "create"
      onSubmit: CreateSubmit
      types: Array<{ value: string; label: string }>
      clientId?: string
    }
  | {
      mode: "edit"
      onSubmit: EditSubmit
      asset: {
        name: string
        primary_contact_name?: string | null
        primary_contact_email?: string | null
        status?: string | null
        monitoring_enabled?: boolean | null
        notes?: string | null
      }
    }
)

// ── Component ──

export function AssetForm(props: AssetFormProps) {
  const { open, onOpenChange, isPending, contacts: contactsProp, mode } = props
  const isCreate = mode === "create"
  const isEdit = mode === "edit"

  // Create-specific props
  const createProps = isCreate ? (props as typeof props & { mode: "create" }) : null
  const types = createProps?.types ?? []
  const clientId = createProps?.clientId ?? ""

  // Edit-specific props
  const editProps = isEdit ? (props as typeof props & { mode: "edit" }) : null
  const asset = editProps?.asset

  // Mode-agnostic submit wrapper
  const onSubmit = props.onSubmit

  const hasClientSelector = isCreate && !createProps?.clientId

  // ── Form ──

  const schema = useMemo(() => buildSchema(mode, hasClientSelector), [mode, hasClientSelector])

  const defaultValues: AssetFormValues = useMemo(() => {
    if (isEdit && asset) {
      return {
        name: asset.name ?? "",
        primary_contact_name: asset.primary_contact_name ?? "",
        primary_contact_email: asset.primary_contact_email ?? "",
        status: asset.status ?? "live",
        monitoring_enabled: asset.monitoring_enabled ?? false,
        notes: asset.notes ?? "",
      }
    }
    return {
      client_id: clientId,
      name: "",
      type: "",
      primary_contact_name: "",
      primary_contact_email: "",
      notes: "",
    }
  }, [isEdit, asset, clientId])

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  // ── Server multi-select (create only) ──

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

  // ── Contacts ──

  const selectedClientId = watch("client_id")

  const { data: clientDetail } = useClient(
    contactsProp || !isCreate ? null : selectedClientId || null
  )
  const contacts: ContactType[] =
    contactsProp ?? (isCreate ? clientDetail?.contacts ?? [] : editProps ? [] : [])

  const selectedContact = contacts.find(
    (c) =>
      c.name === watch("primary_contact_name") &&
      (c.email || "") === (watch("primary_contact_email") || "")
  ) ?? null

  // ── Client search (create mode, no pre-selected client) ──

  const [clientSearch, setClientSearch] = useState("")
  const debouncedClientSearch = useDebounce(clientSearch, 300)

  const { data: searchedClients, isLoading: clientsLoading } = useClients(
    hasClientSelector
      ? { search: debouncedClientSearch || undefined, limit: 50, sort_by: "name", sort_order: "asc" }
      : { limit: 0 },
  )

  const clientOptions = useMemo(
    () =>
      (searchedClients?.data ?? []).map((client) => ({
        value: client.id,
        label: client.company ? `${client.name} (${client.company})` : client.name,
      })),
    [searchedClients],
  )

  // ── Reset on open ──

  useEffect(() => {
    if (open) {
      reset(defaultValues)
      setClientSearch("")
      if (isCreate) {
        setSelectedServerIds([])
        setServerSearch("")
      }
    }
  }, [open, reset, defaultValues, isCreate])

  // Clear contact when client changes (create mode)
  useEffect(() => {
    if (isCreate && hasClientSelector && open) {
      setValue("primary_contact_name", "")
      setValue("primary_contact_email", "")
    }
  }, [selectedClientId, open, setValue, hasClientSelector, isCreate])

  // ── Submit ──

  const onFormSubmit = (data: AssetFormValues) => {
    if (isCreate) {
      ;(onSubmit as CreateSubmit)({
        client_id: createProps?.clientId ?? (data.client_id || undefined),
        name: data.name,
        type: data.type!,
        primary_contact_name: data.primary_contact_name || undefined,
        primary_contact_email: data.primary_contact_email || undefined,
        notes: data.notes || undefined,
        server_ids: selectedServerIds.length > 0 ? selectedServerIds : undefined,
      })
    } else {
      ;(onSubmit as EditSubmit)({
        name: data.name.trim(),
        primary_contact_name: data.primary_contact_name?.trim() || undefined,
        primary_contact_email: data.primary_contact_email?.trim() || undefined,
        status: data.status || undefined,
        monitoring_enabled: data.monitoring_enabled,
        notes: data.notes?.trim() || undefined,
      })
    }
  }

  // ── Helpers ──

  const typeOptions = types.map((t) => ({
    value: t.value,
    label: t.label,
  }))

  // ── Render ──

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-h-screen overflow-y-auto sm:max-w-[458px]">
        <DrawerHeader>
          <DrawerTitle>{isCreate ? "Create Asset" : "Edit Asset"}</DrawerTitle>
          <DrawerDescription>
            {isCreate
              ? createProps?.clientId
                ? "Add a new asset for this client."
                : "Add a new asset to the system."
              : "Update this asset's information."}
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-1 flex-col gap-5 p-4 pt-6"
        >
          {/* Client Selector (create only) */}
          {isCreate && hasClientSelector && (
            <div className="space-y-2">
              <Label>
                Client <span className="text-destructive">*</span>
              </Label>
              <Combobox
                modal
                data={clientOptions}
                onValueChange={(value) =>
                  setValue("client_id", value, { shouldValidate: true, shouldDirty: true })
                }
                type="client"
              >
                <ComboboxTrigger className="w-full justify-between" />
                <ComboboxContent>
                  <ComboboxInput
                    onValueChange={(value) => setClientSearch(value)}
                    placeholder="Select Client"
                  />
                  <ComboboxEmpty />
                  <ComboboxList>
                    <ComboboxGroup>
                      {clientOptions.map((item) => (
                        <ComboboxItem key={item.value} value={item.value} keywords={[item.label]} >
                          {item.label}
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {errors.client_id?.message && (
                <p className="text-xs text-destructive">{errors.client_id.message}</p>
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
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Asset Type (create only) */}
          {isCreate && (
            <div className="space-y-2">
              <Label htmlFor="type-select">
                Type <span className="text-destructive">*</span>
              </Label>
              <SmoothSelect
                options={typeOptions}
                value={watch("type") || undefined}
                onChange={(value) =>
                  setValue("type", value, { shouldValidate: true, shouldDirty: true })
                }
                placeholder="Select asset type..."
              />
              {errors.type?.message && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>
          )}

          {/* Primary Contact */}
          {contacts.length > 0 && (
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
                  setValue("primary_contact_name", contact?.name ?? "", { shouldDirty: true })
                  setValue("primary_contact_email", contact?.email ?? "", { shouldDirty: true })
                }}
              />
              {errors.primary_contact_name?.message && (
                <p className="text-xs text-destructive">{errors.primary_contact_name.message}</p>
              )}
            </div>
          )}

          {/* Servers (create only) */}
          {isCreate && (
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
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedServerIds([])
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation()
                            setSelectedServerIds([])
                          }
                        }}
                        className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label="Clear selection"
                      >
                        <XIcon className="size-3.5" />
                      </span>
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
          )}

          {/* Status (edit only) */}
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


          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="asset-notes">Notes</Label>
            <textarea
              id="asset-notes"
              {...register("notes")}
              placeholder="Additional notes about this asset..."
              rows={3}
              className="h-auto w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"
            />
            {errors.notes?.message && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DrawerFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isPending
                ? isCreate
                  ? "Creating..."
                  : "Saving..."
                : isCreate
                  ? "Create Asset"
                  : "Save Changes"
              }
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
