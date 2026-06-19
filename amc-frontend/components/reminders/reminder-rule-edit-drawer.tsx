"use client"

import { useEffect, useState } from "react"
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
import { SmoothSelect } from "@/components/ui/smooth-select"
import type { ReminderRuleListItem } from "@/types/api"

interface ReminderRuleEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name?: string
    event_type?: string
    trigger_days?: number[]
    channels?: string[]
    enabled?: boolean
  }) => void
  isPending: boolean
  rule: ReminderRuleListItem
}

const editSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  event_type: z.string().min(1, "Event type is required"),
  trigger_days: z.string().min(1, "At least one trigger day is required"),
  enabled: z.boolean(),
})

const EVENT_TYPE_OPTIONS = [
  { value: "domain_expiry", label: "Domain Expiry" },
  { value: "ssl_expiry", label: "SSL Expiry" },
  { value: "contract_expiry", label: "Contract Expiry" },
  { value: "server_expiry", label: "Server Expiry" },
  { value: "incident", label: "Incident" },
]

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "slack", label: "Slack" },
]

export function ReminderRuleEditDrawer({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  rule,
}: ReminderRuleEditDrawerProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: rule.name,
      event_type: rule.event_type,
      trigger_days: rule.trigger_days.join(", "),
      enabled: rule.enabled,
    },
  })

  const [selectedChannels, setSelectedChannels] = useState<string[]>(rule.channels)

  useEffect(() => {
    if (open) {
      reset({
        name: rule.name,
        event_type: rule.event_type,
        trigger_days: rule.trigger_days.join(", "),
        enabled: rule.enabled,
      })
      setSelectedChannels(rule.channels)
    }
  }, [open, reset, rule])

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    )
  }

  const onFormSubmit = (raw: Record<string, unknown>) => {
    const triggerDaysStr = raw.trigger_days as string
    const triggerDays = triggerDaysStr
      .split(",")
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((n: number) => !isNaN(n) && n > 0)

    onSubmit({
      name: raw.name as string,
      event_type: raw.event_type as string,
      trigger_days: triggerDays,
      channels: selectedChannels,
      enabled: raw.enabled as boolean,
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-h-screen overflow-y-auto sm:max-w-[458px]">
        <DrawerHeader>
          <DrawerTitle>Edit Reminder Rule</DrawerTitle>
          <DrawerDescription>
            Update configuration for {rule.name}.
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-1 flex-col gap-5 p-4 pt-6"
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-rule-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-rule-name"
              {...register("name")}
              placeholder="e.g., Domain expiry notice"
              autoFocus
            />
            {errors.name?.message && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="edit-event-type">
              Event Type <span className="text-destructive">*</span>
            </Label>
            <SmoothSelect
              options={EVENT_TYPE_OPTIONS}
              value={watch("event_type")}
              onChange={(value) => setValue("event_type", value, { shouldValidate: true })}
              placeholder="Select event type..."
            />
            {errors.event_type?.message && (
              <p className="text-xs text-destructive">{errors.event_type.message}</p>
            )}
          </div>

          {/* Trigger Days */}
          <div className="space-y-2">
            <Label htmlFor="edit-trigger-days">
              Trigger Days (comma-separated) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-trigger-days"
              {...register("trigger_days")}
              placeholder="e.g., 30, 14, 7, 1"
            />
            <p className="text-xs text-muted-foreground">
              Number of days before expiry to trigger the reminder. Use comma-separated values.
            </p>
            {errors.trigger_days?.message && (
              <p className="text-xs text-destructive">{errors.trigger_days.message}</p>
            )}
          </div>

          {/* Channels */}
          <div className="space-y-2">
            <Label>
              Channels <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNEL_OPTIONS.map((ch) => {
                const isSelected = selectedChannels.includes(ch.value)
                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => toggleChannel(ch.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      isSelected
                        ? "border-primary/40 bg-primary/5 text-foreground ring-1 ring-primary/20"
                        : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <div
                      className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && (
                        <svg className="size-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="capitalize">{ch.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-rule-enabled"
              checked={!!watch("enabled")}
              onChange={(e) => setValue("enabled", e.target.checked, { shouldValidate: true })}
              className="size-4 rounded border-border accent-primary"
            />
            <Label htmlFor="edit-rule-enabled" className="text-sm font-normal">Enable this rule</Label>
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
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
