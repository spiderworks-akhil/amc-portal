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
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useClients } from "@/hooks/use-clients"
import { ContractFormFields, type ContractFormValues } from "./contract-form-fields"
import type { ClientListItem } from "@/types/api"

const contractSchema = z.object({
  client_id: z.string().optional(),
  label: z.string().optional(),
  billing_cycle: z.string().min(1, "Billing cycle is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  renewal_date: z.string().min(1, "Renewal date is required"),
  amount: z.string().optional(),
  currency: z.string().optional(),
  auto_renew: z.boolean().optional(),
  scope: z.string().optional(),
  status: z.string().optional(),
})

interface ContractCreateDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    client_id: string
    label?: string
    contract_number?: string
    billing_cycle: string
    start_date: string
    end_date: string
    renewal_date: string
    amount?: number
    currency?: string
    auto_renew?: boolean
    scope?: string
    status?: string
  }) => void
  isPending: boolean
  /** Pre-selected client ID — hides client selector when provided (used from asset detail page) */
  clientId?: string
}

export function ContractCreateDrawer({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  clientId,
}: ContractCreateDrawerProps) {
  const { data: clientsData } = useClients({ limit: 200, sort_by: "name", sort_order: "asc" })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(
      clientId
        ? contractSchema
        : contractSchema.extend({ client_id: z.string().min(1, "Client is required") })
    ),
    defaultValues: {
      client_id: clientId ?? "",
      label: "",
      billing_cycle: "yearly",
      start_date: "",
      end_date: "",
      renewal_date: "",
      amount: "",
      currency: "USD",
      auto_renew: true,
      scope: "",
      status: "active",
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        client_id: clientId ?? "",
        label: "",
        billing_cycle: "yearly",
        start_date: "",
        end_date: "",
        renewal_date: "",
        amount: "",
        currency: "USD",
        auto_renew: true,
        scope: "",
        status: "active",
      })
    }
  }, [open, reset, clientId])

  const clientOptions = (clientsData?.data ?? []).map((c: ClientListItem) => ({
    value: c.id,
    label: c.company ? `${c.name} (${c.company})` : c.name,
  }))

  const onFormSubmit = (data: ContractFormValues) => {
    onSubmit({
      client_id: data.client_id ?? "",
      label: data.label?.trim() || undefined,
      billing_cycle: data.billing_cycle,
      start_date: data.start_date,
      end_date: data.end_date,
      renewal_date: data.renewal_date,
      amount: data.amount ? Number(data.amount) : undefined,
      currency: data.currency || "USD",
      auto_renew: data.auto_renew ?? true,
      scope: data.scope?.trim() || undefined,
      status: data.status || "active",
    })
    reset()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-[458px] overflow-y-auto max-h-screen">
        <DrawerHeader>
          <DrawerTitle>Create Contract</DrawerTitle>
          <DrawerDescription>
            {clientId ? "Add a new contract and link it to this asset." : "Add a new contract agreement."}
          </DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          {/* Client selector — only shown when no pre-selected client */}
          {!clientId && (
            <div className="space-y-2">
              <Label htmlFor="contract-client">
                Client <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                id="contract-client"
                options={clientOptions}
                value={watch("client_id")}
                onChange={(value) => setValue("client_id", value, { shouldValidate: true })}
                placeholder="Search client..."
                searchPlaceholder="Type to search..."
                emptyText="No clients found."
              />
              {errors.client_id?.message && (
                <p className="text-xs text-destructive">{errors.client_id.message}</p>
              )}
            </div>
          )}

          <ContractFormFields
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            showStatus
          />

          <DrawerFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Contract"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
