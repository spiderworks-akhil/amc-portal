"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SmoothSelect } from "@/components/ui/smooth-select"
import DatePicker from "@/components/date-picker"
import { editDomainSchema, type EditDomainFormValues } from "@/components/domains/domain-validation"
import type { Provider } from "@/types/api"

interface DomainEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    fqdn: string
    registrar_id?: string
    registered_date?: string
    expiry_date?: string
    auto_renew?: boolean
    nameservers?: string[]
    notes?: string
  }) => void
  onDelete: () => void
  isPending: boolean
  isDeleting: boolean
  domain: {
    fqdn: string
    registrar_id?: string | null
    registered_date?: string | null
    expiry_date?: string | null
    auto_renew: boolean
    nameservers?: string[]
    notes?: string | null
  }
  registrars: Provider[]
}

export function DomainEditForm({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
  domain,
  registrars,
}: DomainEditFormProps) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EditDomainFormValues>({
    resolver: zodResolver(editDomainSchema),
    defaultValues: {
      fqdn: domain.fqdn ?? "",
      registrar_id: domain.registrar_id ?? "",
      registered_date: domain.registered_date ?? "",
      expiry_date: domain.expiry_date ?? "",
      auto_renew: domain.auto_renew ?? true,
      nameservers: (domain.nameservers ?? []).join(", "),
      notes: domain.notes ?? "",
    },
  })

  // Sync form when domain prop or drawer opens
  useEffect(() => {
    if (open) reset({
      fqdn: domain.fqdn ?? "",
      registrar_id: domain.registrar_id ?? "",
      registered_date: domain.registered_date ?? "",
      expiry_date: domain.expiry_date ?? "",
      auto_renew: domain.auto_renew ?? true,
      nameservers: (domain.nameservers ?? []).join(", "),
      notes: domain.notes ?? "",
    })
  }, [open, domain, reset])

  const watchedRegisteredDate = watch("registered_date")
  const watchedExpiryDate = watch("expiry_date")

  const onFormSubmit = (data: EditDomainFormValues) => {
    const ns = data.nameservers
      ? data.nameservers.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined
    const nameservers = ns && ns.length > 0 ? ns : undefined

    onSubmit({
      fqdn: data.fqdn,
      registrar_id: data.registrar_id || undefined,
      registered_date: data.registered_date || undefined,
      expiry_date: data.expiry_date || undefined,
      auto_renew: data.auto_renew ?? true,
      nameservers,
      notes: data.notes?.trim() || undefined,
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
        <DrawerHeader>
          <DrawerTitle>Edit Domain</DrawerTitle>
          <DrawerDescription>Update this domain&apos;s information.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          {/* FQDN */}
          <div className="space-y-2">
            <Label htmlFor="domain-fqdn">
              Domain Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="domain-fqdn"
              {...register("fqdn")}
              placeholder="e.g., example.com"
              autoFocus
            />
            {errors.fqdn?.message && <p className="text-xs text-destructive">{errors.fqdn.message}</p>}
          </div>

          {/* Registrar */}
          <div className="space-y-2">
            <Label>Registrar</Label>
            <SmoothSelect
              options={registrars.length === 0 ? [] : registrars.map((r) => ({ value: r.id, label: r.name }))}
              value={watch("registrar_id")}
              onChange={(value) =>
                setValue("registrar_id", value, { shouldValidate: true })
              }
              placeholder="Select registrar..."
              className="w-full"
            />
          </div>

          {/* Two-column: Registered Date + Expiry Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Registered Date</Label>
              <DatePicker
                value={watchedRegisteredDate ? new Date(watchedRegisteredDate) : null}
                onChange={(date) =>
                  setValue("registered_date", format(date, "yyyy-MM-dd"), { shouldValidate: true })
                }
                placeholder="Registered date"
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <DatePicker
                value={watchedExpiryDate ? new Date(watchedExpiryDate) : null}
                onChange={(date) =>
                  setValue("expiry_date", format(date, "yyyy-MM-dd"), { shouldValidate: true })
                }
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
            </div>
            <Input id="domain-ns" {...register("nameservers")} placeholder="e.g., ns1.example.com, ns2.example.com" />
            <p className="text-xs text-muted-foreground">Separate multiple nameservers with commas.</p>
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
