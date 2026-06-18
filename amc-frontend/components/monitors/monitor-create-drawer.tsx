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
import { SmoothSelect } from "@/components/ui/smooth-select"
import { useAssets } from "@/hooks/use-assets"
import type { AssetListItem } from "@/types/api"

interface MonitorCreateDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    asset_id: string
    name: string
    check_type: string
    target: string
    interval_seconds?: number
    expected_status_code?: number
    expected_keyword?: string
    enabled?: boolean
  }) => void
  isPending: boolean
  preSelectedAssetId?: string
}

const monitorSchema = z.object({
  asset_id: z.string().min(1, "Asset is required"),
  name: z.string().min(1, "Name is required").max(255),
  check_type: z.string().min(1, "Check type is required"),
  target: z.string().min(1, "Target is required").max(500),
  interval_seconds: z.string().optional(),
  expected_status_code: z.string().optional(),
  expected_keyword: z.string().max(255).optional(),
  enabled: z.boolean().optional(),
})

export function MonitorCreateDrawer({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  preSelectedAssetId,
}: MonitorCreateDrawerProps) {
  const { data: assetsData } = useAssets({ limit: 200, sort_by: "name", sort_order: "asc" })

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(monitorSchema),
    defaultValues: {
      asset_id: preSelectedAssetId ?? "",
      name: "",
      check_type: "https",
      target: "",
      interval_seconds: "300",
      expected_status_code: "",
      expected_keyword: "",
      enabled: true,
    },
  })

  const selectedCheckType = watch("check_type")

  useEffect(() => {
    if (open) {
      reset({
        asset_id: preSelectedAssetId ?? "",
        name: "",
        check_type: "https",
        target: "",
        interval_seconds: "300",
        expected_status_code: "",
        expected_keyword: "",
        enabled: true,
      })
    }
  }, [open, reset, preSelectedAssetId])

  const assetOptions = (assetsData?.data ?? []).map((a: AssetListItem) => ({
    value: a.id,
    label: a.name,
  }))

  const onFormSubmit = (raw: Record<string, unknown>) => {
    onSubmit({
      asset_id: raw.asset_id as string,
      name: raw.name as string,
      check_type: raw.check_type as string,
      target: raw.target as string,
      interval_seconds: raw.interval_seconds ? Number(raw.interval_seconds) : 300,
      expected_status_code: raw.expected_status_code ? Number(raw.expected_status_code) : undefined,
      expected_keyword: (raw.expected_keyword as string) || undefined,
      enabled: true,
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-h-screen overflow-y-auto sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Create Monitor</DrawerTitle>
          <DrawerDescription>
            Add a new uptime monitor to check your endpoint.
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-1 flex-col gap-5 p-4 pt-6"
        >
          {/* Asset */}
          <div className="space-y-2">
            <Label htmlFor="asset-select">
              Asset <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              id="asset-select"
              options={assetOptions}
              value={watch("asset_id")}
              onChange={(value) => setValue("asset_id", value, { shouldValidate: true })}
              placeholder="Search asset..."
              searchPlaceholder="Type to search..."
              emptyText="No assets found."
            />
            {errors.asset_id?.message && (
              <p className="text-xs text-destructive">{errors.asset_id.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="monitor-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="monitor-name"
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
            <Label htmlFor="check-type">
              Check Type <span className="text-destructive">*</span>
            </Label>
            <SmoothSelect
              options={CHECK_TYPE_OPTIONS}
              value={selectedCheckType}
              onChange={(value) => setValue("check_type", value, { shouldValidate: true })}
              placeholder="Select type..."
            />
            {errors.check_type?.message && (
              <p className="text-xs text-destructive">{errors.check_type.message}</p>
            )}
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label htmlFor="monitor-target">
              Target <span className="text-destructive">*</span>
            </Label>
            <Input
              id="monitor-target"
              {...register("target")}
              placeholder={
                selectedCheckType === "http" || selectedCheckType === "https"
                  ? "https://example.com"
                  : selectedCheckType === "tcp"
                    ? "example.com:443"
                    : selectedCheckType === "ping"
                      ? "8.8.8.8"
                      : "https://example.com"
              }
            />
            {errors.target?.message && (
              <p className="text-xs text-destructive">{errors.target.message}</p>
            )}
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval">Check Interval (seconds)</Label>
            <Input
              id="interval"
              type="number"
              {...register("interval_seconds")}
              placeholder="300"
              min={30}
              max={86400}
            />
            <p className="text-xs text-muted-foreground">Min: 30s — Max: 86400s (24h). Default: 300s (5m).</p>
            {errors.interval_seconds?.message && (
              <p className="text-xs text-destructive">{errors.interval_seconds.message}</p>
            )}
          </div>

          {/* Expected Status Code */}
          <div className="space-y-2">
            <Label htmlFor="status-code">Expected Status Code (HTTP/HTTPS)</Label>
            <Input
              id="status-code"
              type="number"
              {...register("expected_status_code")}
              placeholder="200"
              min={100}
              max={599}
            />
            {errors.expected_status_code?.message && (
              <p className="text-xs text-destructive">{errors.expected_status_code.message}</p>
            )}
          </div>

          {/* Expected Keyword */}
          <div className="space-y-2">
            <Label htmlFor="keyword">Expected Keyword (HTTP/HTTPS/Keyword)</Label>
            <Input
              id="keyword"
              {...register("expected_keyword")}
              placeholder="e.g., Welcome"
            />
            {errors.expected_keyword?.message && (
              <p className="text-xs text-destructive">{errors.expected_keyword.message}</p>
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
              {isPending ? "Creating..." : "Create Monitor"}
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