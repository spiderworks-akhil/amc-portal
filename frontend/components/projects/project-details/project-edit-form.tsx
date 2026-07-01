"use client"

import { ProjectForm } from "@/components/projects/project-form"
import type { Contact as ContactType } from "@/types/api"

interface ProjectEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    primary_contact_name?: string
    primary_contact_email?: string
    status?: string
    monitoring_enabled?: boolean
    notes?: string
    server_ids?: string[]
  }) => void
  isPending: boolean
  project: {
    name: string
    primary_contact_name?: string | null
    primary_contact_email?: string | null
    status?: string | null
    monitoring_enabled?: boolean | null
    notes?: string | null
    server_ids?: string[]
  }
  contacts: ContactType[]
}

export function ProjectEditForm(props: ProjectEditFormProps) {
  return <ProjectForm mode="edit" {...props} />
}
