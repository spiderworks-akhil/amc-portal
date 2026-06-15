"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

import type { Contact as ContactType } from "@/types/api"
import { Checkbox } from "@/components/ui/r-checkbox"

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  designation: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  is_primary: z.boolean().optional(),
})
type ContactFormValues = z.infer<typeof contactSchema>

export function ShowContactForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  contact,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; designation: string; email: string; phone: string; is_primary: boolean }) => void
  isPending: boolean
  contact?: ContactType | null
}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name ?? "",
      designation: contact?.designation ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      is_primary: contact?.is_primary ?? false,
    },
  })

  useEffect(() => {
    reset({
      name: contact?.name ?? "",
      designation: contact?.designation ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      is_primary: contact?.is_primary ?? false,
    })
  }, [contact, reset])

  const onFormSubmit = (data: ContactFormValues) => {
    onSubmit({
      name: data.name.trim(),
      designation: data.designation?.trim() ?? "",
      email: data.email?.trim() ?? "",
      phone: data.phone?.trim() ?? "",
      is_primary: data.is_primary ?? false,
    })
  }

  const isEdit = !!contact

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DrawerTitle>
          <DrawerDescription>
            {isEdit ? "Update this contact's information." : "Add a new contact person for this client."}
          </DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="contact-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="contact-name" {...register("name")} placeholder="John Doe" autoFocus />
            {errors.name?.message && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-designation">Designation</Label>
            <Input id="contact-designation" {...register("designation")} placeholder="CTO / Account Manager" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" {...register("email")} placeholder="john@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input id="contact-phone" {...register("phone")} placeholder="+1 (555) 123-4567" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              {...register("is_primary")}
              // className="size-4 rounded border-input accent-primary"
            />
            <span>Primary contact</span>
          </label>
          <DrawerFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Contact"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
