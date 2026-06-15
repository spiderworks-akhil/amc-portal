"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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

const sslSchema = z.object({
  common_name: z.string().optional(),
  issuer: z.string().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  type: z.string().optional(),
  sans: z.string().optional(),
})
type SslFormValues = z.infer<typeof sslSchema>

const SSL_TYPES = [
  { value: "dv", label: "Domain Validation (DV)" },
  { value: "ov", label: "Organization Validation (OV)" },
  { value: "ev", label: "Extended Validation (EV)" },
  { value: "wildcard", label: "Wildcard" },
]

interface SslEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    common_name?: string
    issuer?: string
    sans?: string[]
    valid_from?: string
    valid_to?: string
    type?: string
  }) => void
  onDelete: () => void
  isPending: boolean
  isDeleting: boolean
  cert: {
    common_name?: string | null
    issuer?: string | null
    sans?: string[]
    valid_from?: string | null
    valid_to?: string | null
    type?: string | null
  }
}

export function SslEditForm({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
  cert,
}: SslEditFormProps) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SslFormValues>({
    resolver: zodResolver(sslSchema),
    defaultValues: {
      common_name: cert.common_name ?? "",
      issuer: cert.issuer ?? "",
      valid_from: cert.valid_from ?? "",
      valid_to: cert.valid_to ?? "",
      type: cert.type ?? "",
      sans: (cert.sans ?? []).join(", "),
    },
  })

  // Sync form when cert prop or drawer opens
  useEffect(() => {
    if (open) reset({
      common_name: cert.common_name ?? "",
      issuer: cert.issuer ?? "",
      valid_from: cert.valid_from ?? "",
      valid_to: cert.valid_to ?? "",
      type: cert.type ?? "",
      sans: (cert.sans ?? []).join(", "),
    })
  }, [open, cert, reset])

  const watchedValidFrom = watch("valid_from")
  const watchedValidTo = watch("valid_to")

  const onFormSubmit = (data: SslFormValues) => {
    const sansList = data.sans
      ? data.sans.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined
    const sans = sansList && sansList.length > 0 ? sansList : undefined

    onSubmit({
      common_name: data.common_name?.trim() || undefined,
      issuer: data.issuer?.trim() || undefined,
      sans,
      valid_from: data.valid_from || undefined,
      valid_to: data.valid_to || undefined,
      type: data.type || undefined,
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-md overflow-y-auto max-h-screen">
        <DrawerHeader>
          <DrawerTitle>Edit SSL Certificate</DrawerTitle>
          <DrawerDescription>Update this certificate&apos;s information.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          {/* Common Name */}
          <div className="space-y-2">
            <Label htmlFor="ssl-cn">Common Name</Label>
            <Input
              id="ssl-cn"
              {...register("common_name")}
              placeholder="e.g., *.example.com or example.com"
              autoFocus
            />
          </div>

          {/* Issuer */}
          <div className="space-y-2">
            <Label htmlFor="ssl-issuer">Issuer</Label>
            <Input
              id="ssl-issuer"
              {...register("issuer")}
              placeholder="e.g., Let's Encrypt, DigiCert"
            />
          </div>

          {/* SSL Type */}
          <div className="space-y-2">
            <Label>Certificate Type</Label>
            <SmoothSelect
              options={SSL_TYPES}
              value={watch("type")}
              onChange={(value) =>
                setValue("type", value, { shouldValidate: true })
              }
              placeholder="Select type..."
              className="w-full"
            />
          </div>

          {/* Two-column: Valid From + Valid To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valid From</Label>
              <DatePicker
                value={watchedValidFrom ? new Date(watchedValidFrom) : null}
                onChange={(date) =>
                  setValue("valid_from", format(date, "yyyy-MM-dd"), { shouldValidate: true })
                }
                placeholder="Valid from"
              />
            </div>
            <div className="space-y-2">
              <Label>Valid To</Label>
              <DatePicker
                value={watchedValidTo ? new Date(watchedValidTo) : null}
                onChange={(date) =>
                  setValue("valid_to", format(date, "yyyy-MM-dd"), { shouldValidate: true })
                }
                placeholder="Valid to"
              />
            </div>
          </div>

          {/* SANs */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="ssl-sans">Subject Alternative Names (SANs)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center justify-center size-3.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-help">
                      <Info className="size-3.5" />
                      <span className="sr-only">SAN format info</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64">
                    Enter additional domain names covered by this certificate, separated by commas.
                    <br />
                    Example: <kbd className="rounded-sm bg-background/20 px-1 font-mono">www.example.com, api.example.com</kbd>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input id="ssl-sans" {...register("sans")} placeholder="e.g., www.example.com, api.example.com" />
            <p className="text-xs text-muted-foreground">Separate multiple names with commas.</p>
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
