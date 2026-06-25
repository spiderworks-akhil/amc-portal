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
import { Loader2 } from "lucide-react"
import { ContractFormFields, type ContractFormValues } from "./contract-form-fields"
import type { ContractDetail } from "@/types/api"

const editSchema = z.object({
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

interface ContractEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    label?: string
    billing_cycle?: string
    start_date?: string
    end_date?: string
    renewal_date?: string
    amount?: number
    currency?: string
    auto_renew?: boolean
    scope?: string
    status?: string
  }) => void
  isPending: boolean
  contract: ContractDetail
}

function extractDate(dateStr: string): string {
  if (!dateStr) return ""
  // Handle ISO format: "2026-06-18T00:00:00Z" → "2026-06-18"
  return dateStr.split("T")[0] ?? dateStr
}

export function ContractEditDrawer({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  contract,
}: ContractEditDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      label: contract.label ?? "",
      billing_cycle: contract.billing_cycle,
      start_date: extractDate(contract.start_date),
      end_date: extractDate(contract.end_date),
      renewal_date: extractDate(contract.renewal_date),
      amount: contract.amount?.toString() ?? "",
      currency: contract.currency ?? "USD",
      auto_renew: contract.auto_renew,
      scope: contract.scope ?? "",
      status: contract.status,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        label: contract.label ?? "",
        billing_cycle: contract.billing_cycle,
        start_date: extractDate(contract.start_date),
        end_date: extractDate(contract.end_date),
        renewal_date: extractDate(contract.renewal_date),
        amount: contract.amount?.toString() ?? "",
        currency: contract.currency ?? "USD",
        auto_renew: contract.auto_renew,
        scope: contract.scope ?? "",
        status: contract.status,
      })
    }
  }, [open, reset, contract])

  const onFormSubmit = (data: ContractFormValues) => {
    onSubmit({
      label: data.label?.trim() || undefined,
      billing_cycle: data.billing_cycle,
      start_date: data.start_date,
      end_date: data.end_date,
      renewal_date: data.renewal_date,
      amount: data.amount ? Number(data.amount) : undefined,
      currency: data.currency || "USD",
      auto_renew: data.auto_renew ?? false,
      scope: data.scope?.trim() || undefined,
      status: data.status,
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-[458px] overflow-y-auto max-h-screen">
        <DrawerHeader>
          <DrawerTitle>Edit Contract</DrawerTitle>
          <DrawerDescription>
            {contract.contract_number || `Contract ${contract.id.slice(0, 8)}`} — {contract.client_name}
          </DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          <ContractFormFields
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            showStatus
            compact
          />

          <DrawerFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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
