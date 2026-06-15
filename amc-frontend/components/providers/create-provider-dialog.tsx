"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Building2 } from "lucide-react"
import { SmoothSelect } from "@/components/ui/smooth-select"

const PROVIDER_TYPES = [
  { value: "cloud", label: "Cloud" },
  { value: "registrar", label: "Registrar" },
  { value: "cdn", label: "CDN" },
  { value: "email", label: "Email" },
  { value: "ssl", label: "SSL" },
  { value: "monitoring", label: "Monitoring" },
  { value: "other", label: "Other" },
]

interface CreateProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; type: string; website?: string; notes?: string }) => void
  isPending: boolean
}

export function CreateProviderDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateProviderDialogProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState("cloud")
  const [website, setWebsite] = useState("")
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<{ name?: string; type?: string }>({})

  // Reset form whenever dialog opens
  useEffect(() => {
    if (open) {
      setName("")
      setType("cloud")
      setWebsite("")
      setNotes("")
      setErrors({})
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { name?: string } = {}
    if (!name.trim()) newErrors.name = "Provider name is required"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    onSubmit({
      name: name.trim(),
      type,
      website: website.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setName("")
    setType("cloud")
    setWebsite("")
    setNotes("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle>Create Provider</DialogTitle>
              <DialogDescription>Add a new service provider (cloud, registrar, CDN, etc.).</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="provider-name"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors({}) }}
                placeholder="e.g., AWS, DigitalOcean, Cloudflare"
                autoFocus
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <SmoothSelect
                options={PROVIDER_TYPES}
                value={type}
                onChange={setType}
                placeholder="Select type..."
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-website">Website</Label>
              <Input
                id="provider-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-notes">Notes</Label>
              <textarea
                id="provider-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                className="h-auto w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Provider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
