"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SmoothSelect } from "@/components/ui/smooth-select";
import DatePicker from "@/components/date-picker";

const contractSchema = z.object({
  client_id: z.string().min(1),
  billing_cycle: z.string().min(1, "Billing cycle is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  renewal_date: z.string().min(1, "Renewal date is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().optional(),
  auto_renew: z.boolean().optional(),
  scope: z.string().optional(),
  status: z.string().optional(),
});
type ContractFormValues = z.infer<typeof contractSchema>;

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
  "CHF",
  "SGD",
  "AED",
  "SAR",
] as const;

const BILLING_CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "one_time", label: "One-Time" },
];

interface CreateContractFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    client_id: string;
    contract_number?: string;
    billing_cycle: string;
    start_date: string;
    end_date: string;
    renewal_date: string;
    amount: number;
    currency?: string;
    auto_renew?: boolean;
    scope?: string;
    status?: string;
  }) => void;
  isPending: boolean;
  clientId: string;
}

export function CreateContractForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  clientId,
}: CreateContractFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      client_id: clientId,
      billing_cycle: "annual",
      start_date: "",
      end_date: "",
      renewal_date: "",
      amount: "",
      currency: "USD",
      auto_renew: true,
      scope: "",
      status: "active",
    },
  });

  // Reset form whenever drawer opens
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const onFormSubmit = (data: ContractFormValues) => {
    onSubmit({
      client_id: clientId,
      billing_cycle: data.billing_cycle,
      start_date: data.start_date,
      end_date: data.end_date,
      renewal_date: data.renewal_date,
      amount: Number(data.amount),
      currency: data.currency || "USD",
      auto_renew: data.auto_renew ?? true,
      scope: data.scope?.trim() || undefined,
      status: data.status || "active",
    });

    reset();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
        <DrawerHeader>
          <DrawerTitle>Create Contract</DrawerTitle>
          <DrawerDescription>
            Add a new contract and link it to this asset.
          </DrawerDescription>
        </DrawerHeader>
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-1 flex-col gap-5 p-4 pt-6"
        >
          {/* Billing Cycle */}
          <div className="space-y-2">
            <Label>
              Billing Cycle <span className="text-destructive">*</span>
            </Label>
            <SmoothSelect
              options={BILLING_CYCLES}
              value={watch("billing_cycle")}
              onChange={(value) =>
                setValue("billing_cycle", value, { shouldValidate: true })
              }
              placeholder="Select billing cycle..."
              className="w-full"
            />
            {errors.billing_cycle?.message && (
              <p className="text-xs text-destructive">
                {errors.billing_cycle.message}
              </p>
            )}
          </div>

          {/* Three columns: Start, End, Renewal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract-start">
                Start <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={
                  watch("start_date") ? new Date(watch("start_date")) : null
                }
                onChange={(date) =>
                  setValue("start_date", format(date, "yyyy-MM-dd"), {
                    shouldValidate: true,
                  })
                }
                placeholder="Start date"
              />
              {errors.start_date?.message && (
                <p className="text-xs text-destructive">
                  {errors.start_date.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-end">
                End <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={watch("end_date") ? new Date(watch("end_date")) : null}
                onChange={(date) =>
                  setValue("end_date", format(date, "yyyy-MM-dd"), {
                    shouldValidate: true,
                  })
                }
                placeholder="End date"
              />
              {errors.end_date?.message && (
                <p className="text-xs text-destructive">
                  {errors.end_date.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract-renewal">
              Renewal <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              value={
                watch("renewal_date") ? new Date(watch("renewal_date")) : null
              }
              onChange={(date) =>
                setValue("renewal_date", format(date, "yyyy-MM-dd"), {
                  shouldValidate: true,
                })
              }
              placeholder="Renewal date"
            />
            {errors.renewal_date?.message && (
              <p className="text-xs text-destructive">
                {errors.renewal_date.message}
              </p>
            )}
          </div>
          {/* Two-column: Amount + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract-amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contract-amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount")}
                placeholder="0.00"
              />
              {errors.amount?.message && (
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <SmoothSelect
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                value={watch("currency")}
                onChange={(value) =>
                  setValue("currency", value, { shouldValidate: true })
                }
                placeholder="Currency"
                className="w-full"
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

          {/* Scope */}
          <div className="space-y-2">
            <Label htmlFor="contract-scope">Scope / Description</Label>
            <textarea
              id="contract-scope"
              {...register("scope")}
              placeholder="Describe what this contract covers..."
              rows={3}
              className="h-auto w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 resize-none"
            />
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
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Creating..." : "Create & Link Contract"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
