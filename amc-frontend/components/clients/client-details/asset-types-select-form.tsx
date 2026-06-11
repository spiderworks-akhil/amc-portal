"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/b-combobox"

export function CreateAssetForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  types,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; type_id: string; primary_url?: string; primary_contact_name?: string; primary_contact_email?: string; notes?: string }) => void
  isPending: boolean
  types: Array<{ id: string; name: string }>
}) {
  const [name, setName] = useState("")
  const [typeId, setTypeId] = useState("")
  const [primaryUrl, setPrimaryUrl] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<{ name?: string; type_id?: string }>({})
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { name?: string; type_id?: string } = {}
    if (!name.trim()) newErrors.name = "Asset name is required"
    if (!typeId) newErrors.type_id = "Asset type is required"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    onSubmit({
      name: name.trim(),
      type_id: typeId,
      primary_url: primaryUrl.trim() || undefined,
      primary_contact_name: contactName.trim() || undefined,
      primary_contact_email: contactEmail.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    
    // Reset form
    setName("")
    setTypeId("")
    setPrimaryUrl("")
    setContactName("")
    setContactEmail("")
    setNotes("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Asset</SheetTitle>
          <SheetDescription>Add a new asset for this client.</SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
          {/* Asset Name */}
          <div className="space-y-2">
            <Label htmlFor="asset-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="asset-name"
              value={name}
              onChange={(e) => { 
                setName(e.target.value)
                setErrors((prev) => ({ ...prev, name: undefined }))
              }}
              placeholder="e.g., Client Website, Mobile App, etc."
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Asset Type with Base UI Combobox */}
          <div className="space-y-2">
            <Label htmlFor="asset-type">
              Type <span className="text-destructive">*</span>
            </Label>
            <Combobox
              value={typeId}
              onValueChange={(value) => {
                setTypeId(value ?? "")
                setErrors((prev) => ({ ...prev, type_id: undefined }))
              }}
            >
              <ComboboxInput placeholder="Select asset type..." />
              <ComboboxContent>
                <div className="max-h-48 overflow-y-auto p-1">
                  {types.map((type) => (
                    <ComboboxItem key={type.id} value={type.id}>
                      {type.name}
                    </ComboboxItem>
                  ))}
                </div>
                <ComboboxEmpty>No type found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
            {errors.type_id && <p className="text-xs text-destructive">{errors.type_id}</p>}
          </div>

          {/* Primary URL */}
          <div className="space-y-2">
            <Label htmlFor="asset-url">Primary URL</Label>
            <Input
              id="asset-url"
              type="url"
              value={primaryUrl}
              onChange={(e) => setPrimaryUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="asset-contact-name">Contact Name</Label>
            <Input
              id="asset-contact-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="asset-contact-email">Contact Email</Label>
            <Input
              id="asset-contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="asset-notes">Notes</Label>
            <textarea
              id="asset-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this asset..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <SheetFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Asset"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}