"use client"

import { ProjectForm } from "./project-form"
import type { Contact as ContactType } from "@/types/api"

interface ProjectCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    type: string
    primary_contact_name?: string
    primary_contact_email?: string
    notes?: string
    client_id?: string
    server_ids?: string[]
  }) => void
  isPending: boolean
  types: Array<{ value: string; label: string }>
  clientId?: string
  contacts?: ContactType[]
}

export function ProjectCreateDialog(props: ProjectCreateDialogProps) {
  return <ProjectForm mode="create" {...props} />
}
