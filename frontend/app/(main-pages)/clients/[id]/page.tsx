"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useClient,
  useUpdateClient,
  useSyncClient,
  useAddManagers,
  useRemoveManagers,
  useAddContact,
  useUpdateContact,
  useDeleteContact,
} from "@/hooks/use-clients";
import {
  useClientProjects,
  useCreateProject,
} from "@/hooks/use-projects";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/r-alert-dialog";
import { BackButton } from "@/components/common/back-button";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  UserPlus,
  X,
  Plus,
  Trash2,
  Check,
  Users,
  Contact,
  MoreVertical,
  Pencil,
  Star,
  Monitor,
  Archive,
  ExternalLink,
  Bell,
  BellOff,
  RefreshCw,
} from "lucide-react";

import type { Contact as ContactType } from "@/types/api";
import { getInitials } from "@/lib/utils";
import { DetailSkeleton } from "@/components/clients/client-details/detail-skeleton";
import { ShowContactForm } from "@/components/clients/client-details/contact-form";
import { ClientEditForm } from "@/components/clients/client-details/client-edit-form";
import { AddManagerSheet } from "@/components/clients/client-details/add-manager-sheet";
import { ProjectCreateDialog } from "@/components/projects/project-create-dialog";
import { NotesTimeline } from "@/components/projects/project-details/notes-timeline";

const PROJECT_TYPES = [
  { value: "website", label: "Website" },
  { value: "landing_page", label: "Landing Page" },
  { value: "mobile_application", label: "Mobile Application" },
];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: client, isLoading, isError } = useClient(id);
  const updateClient = useUpdateClient();
  const syncClient = useSyncClient();
  const { data: projectsData, isLoading: projectsLoading } = useClientProjects(id);
  const createProject = useCreateProject();
  const addManagers = useAddManagers(id);
  const removeManagers = useRemoveManagers(id);
  const addContact = useAddContact(id);
  const updateContact = useUpdateContact(id);
  const deleteContact = useDeleteContact(id);

  const [editClientOpen, setEditClientOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [addManagerOpen, setAddManagerOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactType | null>(
    null,
  );
  const [deletingContactId, setDeletingContactId] = useState<string | null>(
    null,
  );

  const handleAddManager = useCallback(
    (managerId: string) => {
      addManagers.mutate([managerId]);
    },
    [addManagers],
  );

  const handleRemoveManager = useCallback(
    (managerId: string) => {
      removeManagers.mutate([managerId]);
    },
    [removeManagers],
  );

  const handleAddContact = useCallback(
    (data: {
      name: string;
      designation: string;
      email: string;
      phone: string;
      is_primary: boolean;
      should_send_notification: boolean;
      should_send_wp_notification: boolean;
    }) => {
      addContact.mutate(data, {
        onSuccess: () => setAddContactOpen(false),
      });
    },
    [addContact],
  );

  const handleEditContact = useCallback((contact: ContactType) => {
    setEditingContact(contact);
  }, []);

  const handleUpdateContact = useCallback(
    (data: {
      name: string;
      designation: string;
      email: string;
      phone: string;
      is_primary: boolean;
      should_send_notification: boolean;
      should_send_wp_notification: boolean;
    }) => {
      if (!editingContact) return;
      updateContact.mutate(
        { contactId: editingContact.id, ...data },
        {
          onSuccess: () => {
            setEditingContact(null);
          },
        },
      );
    },
    [editingContact, updateContact],
  );

  const handleDeleteContact = useCallback(
    (contactId: string) => {
      deleteContact.mutate(contactId, {
        onSuccess: () => setDeletingContactId(null),
        onError: () => setDeletingContactId(null),
      });
    },
    [deleteContact],
  );

  const handleSetPrimaryContact = useCallback(
    (contactId: string) => {
      updateContact.mutate({ contactId, is_primary: true });
    },
    [updateContact],
  );

  const handleUpdateClient = useCallback(
    (data: {
      name: string;
      company?: string;
      email?: string;
      phone?: string;
      address?: string;
      notes?: string;
    }) => {
      updateClient.mutate(
        { id, ...data },
        { onSuccess: () => setEditClientOpen(false) },
      );
    },
    [id, updateClient],
  );

  const handleCreateProject = useCallback(
    (data: {
      name: string;
      type: string;
      primary_contact_name?: string;
      primary_contact_email?: string;
      notes?: string;
      server_ids?: string[];
    }) => {
      createProject.mutate(
        { ...data, client_id: id },
        { onSuccess: () => setCreateProjectOpen(false) },
      );
    },
    [id, createProject],
  );

  if (isLoading) return <DetailSkeleton />;

  if (isError || !client) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <FileText className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Client not found</h2>
          <p className="text-muted-foreground max-w-sm">
            The client you&apos;re looking for doesn&apos;t exist or may have
            been removed.
          </p>
          <BackButton variant="outline" label="Back" fallbackHref="/clients" />
        </div>
      </div>
    );
  }

  const managerIds = client.accountManagers.map((m) => m.id);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back + Header */}
      <div className="mb-8">
        <BackButton label="Back" fallbackHref="/clients" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {client.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {client.external_id && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => syncClient.mutate(client.id)}
                disabled={syncClient.isPending}
              >
                <RefreshCw className={`size-3.5 mr-1.5 ${syncClient.isPending ? "animate-spin" : ""}`} />
                {syncClient.isPending ? "Syncing..." : "Sync"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setEditClientOpen(true)}
            >
              <Pencil className="size-3.5 mr-1.5" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Company Details */}
      {(client.company || client.email || client.phone || client.address) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4" />
              Company Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {client.company && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building2 className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Company</p>
                    <p className="text-sm font-medium capitalize truncate">{client.company}</p>
                  </div>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Email</p>
                    <p className="text-sm truncate">{client.email}</p>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Phone</p>
                    <p className="text-sm">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Address</p>
                    <p className="text-sm truncate">{client.address}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Managers + Contacts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Managers */}
          <Card className="h-full">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4" />
                  Account Managers
                </CardTitle>
                <CardDescription>
                  {client.accountManagers.length === 0
                    ? "No managers assigned"
                    : `${client.accountManagers.length} manager${client.accountManagers.length > 1 ? "s" : ""}`}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddManagerOpen(true)}
              >
                <UserPlus className="size-3.5 mr-1.5" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {client.accountManagers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No account managers assigned.</p>
                  <p className="text-xs mt-1">
                    Add a manager to oversee this client.
                  </p>
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
                      <p className="text-sm font-medium truncate">
                        {manager.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {manager.email}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger
                        aria-label={`Remove ${manager.name}`}
                        className="text-sm cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Manager</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove{" "}
                            <strong>{manager.name}</strong> as an account
                            manager for {client.name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/80 cursor-pointer"
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
        {/* Client Contacts */}
          <Card className="h-full">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Contact className="size-4" />
                  Contacts
                </CardTitle>
                <CardDescription>
                  {client.contacts.length === 0
                    ? "No contacts added"
                    : `${client.contacts.length} contact${client.contacts.length > 1 ? "s" : ""}`}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddContactOpen(true)}
              >
                <Plus className="size-3.5 mr-1.5" />
                Add Contact
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              {client.contacts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Contact className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No contacts yet</p>
                  <p className="text-xs mt-1">
                    Add contacts to keep track of key people.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {client.contacts.map((contact: ContactType) => (
                    <div
                      key={contact.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleEditContact(contact)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          handleEditContact(contact);
                      }}
                      className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent/50 group cursor-pointer"
                    >
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {contact.name}
                          </p>
                          {contact.is_primary && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary shrink-0">
                              <Check className="size-2.5" />
                              Primary
                            </span>
                          )}
                          {contact.should_send_notification && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 shrink-0">
                              <Bell className="size-2.5" />
                              Notifications
                            </span>
                          )}
                        </div>
                        {contact.designation && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.designation}
                          </p>
                        )}
                        {(contact.email || contact.phone) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {contact.email && (
                              <span className="truncate">{contact.email}</span>
                            )}
                            {contact.email && contact.phone && <span>·</span>}
                            {contact.phone && (
                              <span className="shrink-0">{contact.phone}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
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
                            <DropdownMenuItem
                              onClick={() => handleEditContact(contact)}
                            >
                              <Pencil className="size-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {!contact.is_primary && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleSetPrimaryContact(contact.id)
                                }
                              >
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
                      </div>

                    </div>
                  ))}
                </div>
              )}

              <AlertDialog
                open={!!deletingContactId}
                onOpenChange={(open) => {
                  if (!open) setDeletingContactId(null);
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete{" "}
                      <strong>
                        {client.contacts.find((c) => c.id === deletingContactId)?.name ?? ""}
                      </strong>
                      ? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/80"
                      onClick={() => deletingContactId && handleDeleteContact(deletingContactId)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

      {/* Projects Section */}
      <Card className="mb-6 mt-4">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="size-4" />
              Projects
            </CardTitle>
            <CardDescription>
              {projectsData?.data?.length === 0
                ? "No projects assigned"
                : `${projectsData?.meta?.total ?? 0} project${(projectsData?.meta?.total ?? 0) !== 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateProjectOpen(true)}
          >
            <Plus className="size-3.5 mr-1.5" />
            Create Project
          </Button>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/60 p-4 space-y-3"
                >
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : !projectsData?.data?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <Archive className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No projects yet</p>
              <p className="text-xs mt-1">
                Create a project to track websites, applications, and services
                for this client.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectsData.data.map((project) => (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      router.push(`/projects/${project.id}`);
                  }}
                  className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm hover:bg-accent/30 group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </p>
                        <ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {project.type_name}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${
                        project.status === "live"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : project.status === "staging"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                            : project.status === "development"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                              : "bg-gray-50 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {project.monitoring_enabled && (
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

      {/* Add/Edit Contact Sheet */}
      <ShowContactForm
        key={editingContact?.id ?? (addContactOpen ? "add-open" : "add-closed")}
        open={addContactOpen || !!editingContact}
        onOpenChange={(open) => {
          if (!open) {
            setAddContactOpen(false);
            setEditingContact(null);
          }
        }}
        onSubmit={editingContact ? handleUpdateContact : handleAddContact}
        isPending={
          editingContact ? updateContact.isPending : addContact.isPending
        }
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

      {/* Activity Timeline */}
      <div className="mt-6">
        <NotesTimeline noteableType="client" noteableId={id} />
      </div>

      {/* Create Project Sheet */}
      <ProjectCreateDialog
        key={`create-project-${createProjectOpen}`}
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSubmit={handleCreateProject}
        isPending={createProject.isPending}
        types={PROJECT_TYPES}
        clientId={id}
        contacts={client.contacts}
      />
    </div>
  );
}
