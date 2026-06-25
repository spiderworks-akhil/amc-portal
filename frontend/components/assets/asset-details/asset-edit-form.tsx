"use client"

import { AssetForm } from "@/components/assets/asset-form"
import type { Contact as ContactType } from "@/types/api"

interface AssetEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    primary_contact_name?: string
    primary_contact_email?: string
    status?: string
    monitoring_enabled?: boolean
    notes?: string
  }) => void
  isPending: boolean
  asset: {
    name: string
    primary_contact_name?: string | null
    primary_contact_email?: string | null
    status?: string | null
    monitoring_enabled?: boolean | null
    notes?: string | null
  }
  contacts: ContactType[]
}

export function AssetEditForm(props: AssetEditFormProps) {
  return <AssetForm mode="edit" {...props} />
}
