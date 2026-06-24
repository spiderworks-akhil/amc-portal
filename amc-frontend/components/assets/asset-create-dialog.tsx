"use client"

import { AssetForm } from "./asset-form"
import type { ClientListItem, Contact as ContactType } from "@/types/api"

interface AssetCreateDialogProps {
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
  clients?: ClientListItem[]
  contacts?: ContactType[]
}

export function AssetCreateDialog(props: AssetCreateDialogProps) {
  return <AssetForm mode="create" {...props} />
}
