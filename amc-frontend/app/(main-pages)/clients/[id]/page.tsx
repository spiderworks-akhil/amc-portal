"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useClient, useUpdateClient, useAddManagers, useRemoveManagers, useAvailableManagers, useAddContact, useUpdateContact, useDeleteContact } from "@/hooks/use-clients"
import { useClientAssets, useCreateAsset, useAssetTypes } from "@/hooks/use-assets"

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/r-alert-dialog"
import { ArrowLeft, Building2, Mail, Phone, MapPin, FileText, UserPlus, X, Plus, Trash2, Check, Loader2, Users, Contact, MoreVertical, Pencil, Star, Monitor, Globe, Archive } from "lucide-react"

import type { Contact as ContactType } from "@/types/api"
import { CreateAssetForm } from "@/components/clients/client-details/asset-types-select-form"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}

function ShowContactForm({
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
  const [name, setName] = useState(contact?.name ?? "")
  const [designation, setDesignation] = useState(contact?.designation ?? "")
  const [email, setEmail] = useState(contact?.email ?? "")
  const [phone, setPhone] = useState(contact?.phone ?? "")
  const [isPrimary, setIsPrimary] = useState(contact?.is_primary ?? false)
  const [errors, setErrors] = useState<{ name?: string }>({})

  // Reset form when contact changes (open for edit with different contact)
  useEffect(() => {
    setName(contact?.name ?? "")
    setDesignation(contact?.designation ?? "")
    setEmail(contact?.email ?? "")
    setPhone(contact?.phone ?? "")
    setIsPrimary(contact?.is_primary ?? false)
    setErrors({})
  }, [contact])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrors({ name: "Name is required" })
      return
    }
    setErrors({})
    onSubmit({ name: name.trim(), designation: designation.trim(), email: email.trim(), phone: phone.trim(), is_primary: isPrimary })
  }

  const isEdit = !!contact

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Contact" : "Add Contact"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update this contact's information." : "Add a new contact person for this client."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="contact-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors({}) }}
              placeholder="John Doe"
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-designation">Designation</Label>
            <Input
              id="contact-designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="CTO / Account Manager"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input
              id="contact-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            <span>Primary contact</span>
          </label>

          <SheetFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Contact"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function ClientEditForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  client,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; company?: string; email?: string; phone?: string; address?: string; notes?: string }) => void
  isPending: boolean
  client: { name: string; company?: string | null; email?: string | null; phone?: string | null; address?: string | null; notes?: string | null }
}) {
  const [name, setName] = useState(client.name ?? "")
  const [company, setCompany] = useState(client.company ?? "")
  const [email, setEmail] = useState(client.email ?? "")
  const [phone, setPhone] = useState(client.phone ?? "")
  const [address, setAddress] = useState(client.address ?? "")
  const [notes, setNotes] = useState(client.notes ?? "")
  const [errors, setErrors] = useState<{ name?: string }>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrors({ name: "Client name is required" })
      return
    }
    setErrors({})
    onSubmit({
      name: name.trim(),
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Client</SheetTitle>
          <SheetDescription>Update this client&apos;s information.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 p-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="client-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors({}) }}
              placeholder="Acme Corp"
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-company">Company</Label>
            <Input
              id="client-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corporation"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@acme.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-phone">Phone</Label>
            <Input
              id="client-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-address">Address</Label>
            <Input
              id="client-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-notes">Notes</Label>
            <textarea
              id="client-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this client..."
              rows={4}
              className="h-auto w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 resize-none"
            />
          </div>

          <SheetFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}



function AddManagerSheet({
  open,
  onOpenChange,
  onSelect,
  excludeIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (id: string) => void
  excludeIds: string[]
}) {
  const { data: availableManagers, isLoading } = useAvailableManagers()
  const [search, setSearch] = useState("")

  const filtered = (availableManagers ?? []).filter(
    (m) => !excludeIds.includes(m.id) && (m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Add Account Manager</SheetTitle>
          <SheetDescription>Search and assign a user as an account manager.</SheetDescription>
        </SheetHeader>
        <div className="p-4 pt-6 space-y-4">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search ? "No users found" : "No users available"}
              </div>
            ) : (
              filtered.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onSelect(user.id)
                    setSearch("")
                    onOpenChange(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <UserPlus className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: client, isLoading, isError } = useClient(id)
  const updateClient = useUpdateClient()
  const { data: assetsData, isLoading: assetsLoading } = useClientAssets(id)
  const createAsset = useCreateAsset()
  const { data: assetTypes } = useAssetTypes()
  const addManagers = useAddManagers(id)
  const removeManagers = useRemoveManagers(id)
  const addContact = useAddContact(id)
  const updateContact = useUpdateContact(id)
  const deleteContact = useDeleteContact(id)

  const [editClientOpen, setEditClientOpen] = useState(false)
  const [createAssetOpen, setCreateAssetOpen] = useState(false)
  const [addManagerOpen, setAddManagerOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactType | null>(null)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null)

  const handleAddManager = useCallback(
    (managerId: string) => {
      addManagers.mutate([managerId])
    },
    [addManagers]
  )

  const handleRemoveManager = useCallback(
    (managerId: string) => {
      removeManagers.mutate([managerId])
    },
    [removeManagers]
  )

  const handleAddContact = useCallback(
    (data: { name: string; designation: string; email: string; phone: string; is_primary: boolean }) => {
      addContact.mutate(data, {
        onSuccess: () => setAddContactOpen(false),
      })
    },
    [addContact]
  )

  const handleEditContact = useCallback(
    (contact: ContactType) => {
      setEditingContact(contact)
    },
    []
  )

  const handleUpdateContact = useCallback(
    (data: { name: string; designation: string; email: string; phone: string; is_primary: boolean }) => {
      if (!editingContact) return
      updateContact.mutate(
        { contactId: editingContact.id, ...data },
        {
          onSuccess: () => {
            setEditingContact(null)
          },
        }
      )
    },
    [editingContact, updateContact]
  )

  const handleDeleteContact = useCallback(
    (contactId: string) => {
      deleteContact.mutate(contactId, {
        onSuccess: () => setDeletingContactId(null),
        onError: () => setDeletingContactId(null),
      })
    },
    [deleteContact]
  )

  const handleSetPrimaryContact = useCallback(
    (contactId: string) => {
      updateContact.mutate({ contactId, is_primary: true })
    },
    [updateContact]
  )

  const handleUpdateClient = useCallback(
    (data: { name: string; company?: string; email?: string; phone?: string; address?: string; notes?: string }) => {
      updateClient.mutate(
        { id, ...data },
        { onSuccess: () => setEditClientOpen(false) }
      )
    },
    [id, updateClient]
  )

  const handleCreateAsset = useCallback(
    (data: { name: string; type_id: string; primary_url?: string; primary_contact_name?: string; primary_contact_email?: string; notes?: string }) => {
      createAsset.mutate(
        { ...data, client_id: id },
        { onSuccess: () => setCreateAssetOpen(false) }
      )
    },
    [id, createAsset]
  )

  if (isLoading) return <DetailSkeleton />

  if (isError || !client) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <FileText className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Client not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The client you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <Button variant="outline" onClick={() => router.push("/clients")}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>
    )
  }

  const managerIds = client.accountManagers.map((m) => m.id)

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back + Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" onClick={() => router.push("/clients")}>
          <ArrowLeft className="size-4 mr-1" />
          Back to Clients
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{client.name}</h1>
            {client.company && (
              <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Building2 className="size-4 shrink-0" />
                <span className="truncate">{client.company}</span>
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => setEditClientOpen(true)}>
            <Pencil className="size-3.5 mr-1.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Two-column layout: Info + Managers */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Left: Client Details */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Client Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.email && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Email</p>
                    <p className="text-sm">{client.email}</p>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Phone</p>
                    <p className="text-sm">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Address</p>
                    <p className="text-sm">{client.address}</p>
                  </div>
                </div>
              )}
              {client.notes && (
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                  </div>
                </div>
              )}
              {!client.email && !client.phone && !client.address && !client.notes && (
                <p className="text-sm text-muted-foreground py-2">No additional details available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Account Managers */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4" />
                  Account Managers
                </CardTitle>
                <CardDescription>
                  {client.accountManagers.length === 0
                    ? "No managers assigned"
                    : `${client.accountManagers.length} manager${client.accountManagers.length > 1 ? "s" : ""}`
                  }
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAddManagerOpen(true)}>
                <UserPlus className="size-3.5 mr-1.5" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {client.accountManagers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No account managers assigned.</p>
                  <p className="text-xs mt-1">Add a manager to oversee this client.</p>
                </div>
              ) : (
                client.accountManagers.map((manager) => (
                  <div
                    key={manager.id}
                    className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent/50 group"
                  >
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(manager.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{manager.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{manager.email}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger
                        className="size-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive focus-visible:opacity-100"
                        aria-label={`Remove ${manager.name}`}
                      >
                        <X className="size-3.5" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Manager</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove <strong>{manager.name}</strong> as an account manager for {client.name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/80"
                            onClick={() => handleRemoveManager(manager.id)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contacts Section */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Contact className="size-4" />
              Contacts
            </CardTitle>
            <CardDescription>
              {client.contacts.length === 0
                ? "No contacts added"
                : `${client.contacts.length} contact${client.contacts.length > 1 ? "s" : ""}`
              }
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddContactOpen(true)}>
            <Plus className="size-3.5 mr-1.5" />
            Add Contact
          </Button>
        </CardHeader>
        <CardContent>
          {client.contacts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Contact className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No contacts yet</p>
              <p className="text-xs mt-1">Add contacts to keep track of key people at this client.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.contacts.map((contact: ContactType) => (
                <div
                  key={contact.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleEditContact(contact)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleEditContact(contact) }}
                  className="relative rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm hover:bg-accent/30 group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {contact.name}
                          {contact.is_primary && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              <Check className="size-2.5" />
                              Primary
                            </span>
                          )}
                        </p>
                        {contact.designation && (
                          <p className="text-xs text-muted-foreground">{contact.designation}</p>
                        )}
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="size-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent text-muted-foreground hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                            aria-label={`Contact options for ${contact.name}`}
                          >
                            <MoreVertical className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                            <Pencil className="size-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!contact.is_primary && (
                            <DropdownMenuItem onClick={() => handleSetPrimaryContact(contact.id)}>
                              <Star className="size-3.5 mr-2" />
                              Set as Primary
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => setDeletingContactId(contact.id)}
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <AlertDialog
                        open={deletingContactId === contact.id}
                        onOpenChange={(open) => { if (!open) setDeletingContactId(null) }}
                      >
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <strong>{contact.name}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/80"
                              onClick={() => handleDeleteContact(contact.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3">
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="size-3 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="size-3 shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="size-4" />
              Assets
            </CardTitle>
            <CardDescription>
              {assetsData?.data?.length === 0
                ? "No assets assigned"
                : `${assetsData?.meta?.total ?? 0} asset${(assetsData?.meta?.total ?? 0) !== 1 ? "s" : ""}`
              }
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateAssetOpen(true)}>
            <Plus className="size-3.5 mr-1.5" />
            Create Asset
          </Button>
        </CardHeader>
        <CardContent>
          {assetsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/60 p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : !assetsData?.data?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <Archive className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No assets yet</p>
              <p className="text-xs mt-1">Create an asset to track websites, applications, and services for this client.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assetsData.data.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.type_name}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${
                      asset.status === "live" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                      asset.status === "staging" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                      asset.status === "development" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" :
                      "bg-gray-50 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400"
                    }`}>
                      {asset.status}
                    </span>
                  </div>
                  {asset.primary_url && (
                    <a
                      href={asset.primary_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary truncate transition-colors"
                    >
                      <Globe className="size-3 shrink-0" />
                      <span className="truncate">{asset.primary_url}</span>
                    </a>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {asset.monitoring_enabled && (
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Monitored
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Manager Sheet */}
      <AddManagerSheet
        open={addManagerOpen}
        onOpenChange={setAddManagerOpen}
        onSelect={handleAddManager}
        excludeIds={managerIds}
      />

      {/* Add/Edit Contact Sheet - key changes on mode to force remount with fresh state */}
      <ShowContactForm
        key={editingContact?.id ?? (addContactOpen ? "add-open" : "add-closed")}
        open={addContactOpen || !!editingContact}
        onOpenChange={(open) => {
          if (!open) {
            setAddContactOpen(false)
            setEditingContact(null)
          }
        }}
        onSubmit={editingContact ? handleUpdateContact : handleAddContact}
        isPending={editingContact ? updateContact.isPending : addContact.isPending}
        contact={editingContact}
      />

      {/* Edit Client Sheet */}
      <ClientEditForm
        key={`edit-client-${editClientOpen}`}
        open={editClientOpen}
        onOpenChange={setEditClientOpen}
        onSubmit={handleUpdateClient}
        isPending={updateClient.isPending}
        client={client}
      />

      {/* Create Asset Sheet */}
      <CreateAssetForm
        key={`create-asset-${createAssetOpen}`}
        open={createAssetOpen}
        onOpenChange={setCreateAssetOpen}
        onSubmit={handleCreateAsset}
        isPending={createAsset.isPending}
        types={assetTypes ?? []}
      />
    </div>
  )
}
