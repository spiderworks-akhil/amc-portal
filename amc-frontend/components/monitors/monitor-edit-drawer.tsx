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
import { SmoothSelect } from "@/components/ui/smooth-select"
import type { MonitorListItem } from "@/types/api"

interface MonitorEditDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name?: string
    check_type?: string
    target?: string
    interval_seconds?: number
    enabled?: boolean
  }) => void
  isPending: boolean
  monitor: MonitorListItem
}

const editSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  check_type: z.string().min(1, "Check type is required"),
  target: z.string().min(1, "Target is required").max(500),
  interval_seconds: z.string().optional(),
  enabled: z.boolean(),
})

export function MonitorEditDrawer({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  monitor,
}: MonitorEditDrawerProps) {
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
      name: monitor.name,
      check_type: monitor.check_type,
      target: monitor.target,
      interval_seconds: String(monitor.interval_seconds),
      enabled: monitor.enabled,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: monitor.name,
        check_type: monitor.check_type,
        target: monitor.target,
        interval_seconds: String(monitor.interval_seconds),
        enabled: monitor.enabled,
      })
    }
  }, [open, reset, monitor])

  const onFormSubmit = (raw: Record<string, unknown>) => {
    onSubmit({
      name: raw.name as string,
      check_type: raw.check_type as string,
      target: raw.target as string,
      interval_seconds: raw.interval_seconds ? Number(raw.interval_seconds) : undefined,
      enabled: raw.enabled as boolean,
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-h-screen overflow-y-auto sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Edit Monitor</DrawerTitle>
          <DrawerDescription>
            Update configuration for {monitor.name}.
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-1 flex-col gap-5 p-4 pt-6"
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              {...register("name")}
              placeholder="e.g., Production Website"
              autoFocus
            />
            {errors.name?.message && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Check Type */}
          <div className="space-y-2">
            <Label htmlFor="edit-type">
              Check Type <span className="text-destructive">*</span>
            </Label>
            <SmoothSelect
              options={CHECK_TYPE_OPTIONS}
              value={watch("check_type")}
              onChange={(value) => setValue("check_type", value, { shouldValidate: true })}
              placeholder="Select type..."
            />
            {errors.check_type?.message && (
              <p className="text-xs text-destructive">{errors.check_type.message}</p>
            )}
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label htmlFor="edit-target">
              Target <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-target"
              {...register("target")}
              placeholder="https://example.com"
            />
            {errors.target?.message && (
              <p className="text-xs text-destructive">{errors.target.message}</p>
            )}
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <Label htmlFor="edit-interval">Check Interval (seconds)</Label>
            <Input
              id="edit-interval"
              type="number"
              {...register("interval_seconds")}
              min={30}
              max={86400}
            />
            {errors.interval_seconds?.message && (
              <p className="text-xs text-destructive">{errors.interval_seconds.message}</p>
            )}
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-enabled"
              checked={watch("enabled")}
              onChange={(e) => setValue("enabled", e.target.checked, { shouldValidate: true })}
              className="size-4 rounded border-border accent-primary"
            />
            <Label htmlFor="edit-enabled" className="text-sm font-normal">Enabled</Label>
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

const CHECK_TYPE_OPTIONS = [
  { value: "http", label: "HTTP" },
  { value: "https", label: "HTTPS" },
  { value: "tcp", label: "TCP" },
  { value: "ping", label: "Ping" },
  { value: "keyword", label: "Keyword" },
]