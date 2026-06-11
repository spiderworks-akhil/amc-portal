export interface Client {
  id: string
  name: string
  company?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  is_active: boolean
  notes?: string | null
  external_id?: string | null
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface ClientListItem {
  id: string
  name: string
  company?: string | null
  email?: string | null
  is_active: boolean
  manager_count: number
  manager_names: string[]
  asset_count: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ClientDetail extends Client {
  accountManagers: AccountManager[]
  contacts: Contact[]
}

export interface AccountManager {
  id: string
  name: string
  email: string
}

export interface Contact {
  id: string
  client_id: string
  name: string
  designation?: string | null
  email?: string | null
  phone?: string | null
  is_primary: boolean
  created_at: string
}

export interface CreateClientPayload {
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  is_active?: boolean
  notes?: string
}

export interface UpdateClientPayload {
  name?: string
  company?: string
  email?: string
  phone?: string
  address?: string
  is_active?: boolean
  notes?: string
}

export interface CreateContactPayload {
  name: string
  designation?: string
  email?: string
  phone?: string
  is_primary?: boolean
}

export interface UpdateContactPayload {
  name?: string
  designation?: string
  email?: string
  phone?: string
  is_primary?: boolean
}

export interface ApiResponse<T> {
  message: string
  data: T
}

export interface SyncSummary {
  totalFetched: number
  imported: number
  updated: number
  softDeleted: number
  skipped: number
}

export interface AssetListItem {
  id: string
  name: string
  primary_url?: string | null
  status: string
  type_id: string
  client_id: string
  monitoring_enabled: boolean
  primary_contact_name?: string | null
  primary_contact_email?: string | null
  created_at: string
  updated_at: string
  type_name: string
  client_name: string
}

export interface AssetType {
  id: string
  name: string
  description?: string | null
  created_at: string
}

export interface CreateAssetPayload {
  name: string
  client_id: string
  type_id: string
  primary_url?: string
  status?: string
  primary_contact_name?: string
  primary_contact_email?: string
  monitoring_enabled?: boolean
  tech_stack?: string[]
  tags?: string[]
  notes?: string
}

export interface CreateAssetTypePayload {
  name: string
  description?: string
}

export interface ListClientsParams {
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  sort_order?: "asc" | "desc"
}
