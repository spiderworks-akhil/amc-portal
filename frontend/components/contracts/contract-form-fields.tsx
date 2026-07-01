"use client"

import { useCallback } from "react"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SmoothSelect } from "@/components/ui/smooth-select"
import DatePicker from "@/components/date-picker"
import DateRangePicker from "@/components/date-range-picker"
import { type DateRange } from "react-day-picker"
import type { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form"
import { Textarea } from "../ui"

export interface ContractFormValues {
  client_id?: string
  label?: string
  billing_cycle: string
  start_date: string
  end_date?: string
  renewal_date?: string
  amount?: string
  currency?: string
  auto_renew?: boolean
  scope?: string
  status?: string
}

export const CURRENCIES = ["INR", "AED", "QAR", "KWD", "BHD", "OMR", "SAR", "EUR", "USD", "GBP", "CAD", "AUD", "JPY", "CNY", "CHF", "SGD"]

export const BILLING_CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
]

interface ContractFormFieldsProps {
  register: UseFormRegister<ContractFormValues>
  setValue: UseFormSetValue<ContractFormValues>
  watch: UseFormWatch<ContractFormValues>
  errors: FieldErrors<ContractFormValues>
  showStatus?: boolean
  // When true, shows a simpler field layout appropriate for the edit drawer
  compact?: boolean
}

function formatDateSafe(date: Date): string {
  try {
    return format(date, "yyyy-MM-dd")
  } catch {
    return ""
  }
}

export function ContractFormFields({
  register,
  setValue,
  watch,
  errors,
  showStatus = false,
  compact = false,
}: ContractFormFieldsProps) {
  const selectedCycle = watch("billing_cycle")
  const isCustom = selectedCycle === "custom"
  const currentStartDate = watch("start_date")
  const currentEndDate = watch("end_date")
  const currentRenewalDate = watch("renewal_date")

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      if (!range) return
      if (range.from) {
        setValue("start_date", formatDateSafe(range.from), { shouldValidate: true })
      }
      if (range.to) {
        setValue("end_date", formatDateSafe(range.to), { shouldValidate: true })
        // Auto-set renewal to 30 days before end date for custom cycles
        const renewalDate = new Date(range.to)
        renewalDate.setDate(renewalDate.getDate() - 30)
        setValue("renewal_date", formatDateSafe(renewalDate), { shouldValidate: true })
      }
    },
    [setValue],
  )

  return (
    <>
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor={compact ? "edit-label" : "contract-label"}>Label</Label>
        <Input
          id={compact ? "edit-label" : "contract-label"}
          {...register("label")}
          placeholder="e.g. Annual Maintenance Contract"
        />
      </div>

      {/* Billing Cycle */}
      <div className="space-y-2">
        <Label>
          Billing Cycle <span className="text-destructive">*</span>
        </Label>
        <SmoothSelect
          options={BILLING_CYCLES}
          value={selectedCycle}
          onChange={(value) => {
            setValue("billing_cycle", value, { shouldValidate: true })
            // Reset dates when switching to/from custom
            if (value !== "custom") {
              // Keep existing dates, user can adjust
            }
          }}
          placeholder="Select billing cycle..."
          className="w-full"
        />
        {errors.billing_cycle?.message && (
          <p className="text-xs text-destructive">{errors.billing_cycle.message}</p>
        )}
      </div>

      {isCustom ? (
        /* Date Range Picker for custom cycles */
        <div className="space-y-2">
          <Label>
            Contract Period <span className="text-destructive">*</span>
          </Label>
          <DateRangePicker
            value={{
              from: currentStartDate ? new Date(currentStartDate) : undefined,
              to: currentEndDate ? new Date(currentEndDate) : undefined,
            }}
            onChange={handleDateRangeChange}
          />
          {(errors.start_date?.message || errors.end_date?.message) && (
            <p className="text-xs text-destructive">
              {errors.start_date?.message || errors.end_date?.message}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Standard dates: Start, End, Renewal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Start <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={currentStartDate ? new Date(currentStartDate) : null}
                onChange={(date) => setValue("start_date", formatDateSafe(date), { shouldValidate: true })}
                placeholder="Start date"
              />
              {errors.start_date?.message && <p className="text-xs text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <DatePicker
                value={currentEndDate ? new Date(currentEndDate) : null}
                onChange={(date) => setValue("end_date", date ? formatDateSafe(date) : "", { shouldValidate: true })}
                placeholder="End date"
              />
              {errors.end_date?.message && <p className="text-xs text-destructive">{errors.end_date.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Renewal</Label>
            <DatePicker
              value={currentRenewalDate ? new Date(currentRenewalDate) : null}
              onChange={(date) => setValue("renewal_date", date ? formatDateSafe(date) : "", { shouldValidate: true })}
              placeholder="Renewal date"
            />
            {errors.renewal_date?.message && <p className="text-xs text-destructive">{errors.renewal_date.message}</p>}
          </div>
        </>
      )}

      {/* Amount + Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={compact ? "edit-amount" : "contract-amount"}>
            Amount
          </Label>
          <Input
            id={compact ? "edit-amount" : "contract-amount"}
            type="number"
            step="0.01"
            min="0"
            {...register("amount")}
            placeholder="0.00"
          />
          {errors.amount?.message && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <SmoothSelect
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            value={watch("currency")}
            onChange={(value) => setValue("currency", value, { shouldValidate: true })}
            placeholder="Currency"
            className="w-full"
          />
        </div>
      </div>

      {/* Status (only shown when editing or creating standalone) */}
      {showStatus && (
        <div className="space-y-2">
          <Label>Status</Label>
          <SmoothSelect
            options={[
              { value: "active", label: "Active" },
              { value: "expiring", label: "Expiring" },
              { value: "expired", label: "Expired" },
              { value: "draft", label: "Draft" },
              { value: "terminated", label: "Terminated" },
            ]}
            value={watch("status")}
            onChange={(value) => setValue("status", value, { shouldValidate: true })}
            placeholder="Select status..."
            className="w-full"
          />
        </div>
      )}

      {/* Auto-renew toggle */}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          {...register("auto_renew")}
          className="size-4 rounded border-input accent-primary"
        />
        <span>Auto-renew</span>
      </label>

      {/* Scope */}
      <div className="space-y-2">
        <Label htmlFor={compact ? "edit-scope" : "contract-scope"}>Scope / Description</Label>
        <Textarea
          id={compact ? "edit-scope" : "contract-scope"}
          {...register("scope")}
          placeholder="Describe what this contract covers..."
          />
      </div>
    </>
  )
}
