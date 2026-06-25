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

export interface AppConfig {
  id: string
  group: string
  config: Record<string, unknown>
  updated_by_id: string | null
  created_at: string
  updated_at: string
}

export interface SmtpConfig {
  host: string
  port: number
  user: string
  password: string
  from_email: string
  from_name?: string
  encryption?: string
}

export interface WhatsAppConfig {
  api_key: string
  api_secret?: string
  phone_number_id: string
  business_account_id?: string
  webhook_verify_token?: string
  domain_created_template?: string
  ssl_created_template?: string
  server_created_template?: string
  incident_created_template?: string
  domain_expiry_template?: string
  ssl_expiry_template?: string
  server_expiry_template?: string
  contract_expiry_template?: string
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
  should_send_notification: boolean
  created_at: string
}

export interface ExternalClientAccount {
  id: string
  client_name: string
  registered_name: string | null
  website: string | null
  phone: string | null
  email: string | null
  contact_name: string | null
  address: string | null
  country_id: string | null
  country: string | null
  is_active: boolean
  ready_to_delete: boolean
  status: string
  logo_file_name: string | null
  invoice_follow_up_days: number
  repeat_follow_up_days: number
  posted_date: string
  organization_id: string
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateClientPayload {
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  is_active?: boolean
  notes?: string
  remarks?: string
  custom_fields?: Record<string, unknown>
  external_id: string
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
  should_send_notification?: boolean
}

export interface UpdateContactPayload {
  name?: string
  designation?: string
  email?: string
  phone?: string
  is_primary?: boolean
  should_send_notification?: boolean
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
  contactsSynced?: number
}

export interface AssetListItem {
  id: string
  name: string
  status: string
  type: string
  client_id: string
  monitoring_enabled: boolean
  primary_contact_name?: string | null
  primary_contact_email?: string | null
  created_at: string
  updated_at: string
  type_name: string
  client_name: string
}

export interface CreateAssetPayload {
  name: string
  client_id: string
  type: string
  status?: string
  primary_contact_name?: string
  primary_contact_email?: string
  monitoring_enabled?: boolean
  tech_stack?: string[]
  tags?: string[]
  notes?: string
  server_ids?: string[]
}

export interface ListClientsParams {
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  sort_order?: "asc" | "desc"
}

export interface ListAssetsParams {
  page?: number
  limit?: number
  search?: string
  client_id?: string
  type?: string
  status?: string
  sort_by?: string
  sort_order?: "asc" | "desc"
}

export interface AssetDetail extends AssetListItem {
  notes?: string | null
  tech_stack?: string[] | null
  account_managers: AccountManager[]
  servers: Array<{
    id: string
    label: string
    ip_addresses: string[]
    region?: string | null
    monthly_cost?: string | null
    currency?: string | null
    renewal_date?: string | null
  }>
  domains: Array<{
    id: string
    fqdn: string
    registrar_id?: string | null
    registered_date?: string | null
    expiry_date?: string | null
    auto_renew: boolean
    nameservers?: string[]
    last_checked_at?: string | null
    registrar_name?: string | null
  }>
  ssl_certificates: Array<{
    id: string
    domain_id?: string | null
    issuer?: string | null
    common_name?: string | null
    sans?: string[]
    valid_from?: string | null
    valid_to?: string | null
    type?: string | null
    last_checked_at?: string | null
    domain_fqdn?: string | null
  }>
  scopes: Scope[]
}

export interface ContractListItem {
  id: string
  client_id: string
  client_name: string
  contract_number?: string | null
  billing_cycle: string
  start_date: string
  end_date: string
  renewal_date: string
  amount: string
  currency: string
  auto_renew: boolean
  scope?: string | null
  status: string
  created_at: string
  updated_at: string
  asset_count: number
}

export interface ContractDetail {
  id: string
  client_id: string
  client_name: string
  client_email?: string | null
  client_company?: string | null
  contract_number?: string | null
  billing_cycle: string
  start_date: string
  end_date: string
  renewal_date: string
  amount: string
  currency: string
  auto_renew: boolean
  scope?: string | null
  status: string
  notes?: string | null
  created_at: string
  updated_at: string
  scopes: Scope[]
  assets: Array<{
    id: string
    name: string
    status: string
    type_name: string
  }>
  renewals: Array<{
    id: string
    previous_end_date: string
    new_start_date: string
    new_end_date: string
    amount: string
    notes?: string | null
    renewed_at: string
  }>
}

export interface CreateServerPayload {
  provider_id: string
  label: string
  ip_addresses?: string[]
  region?: string
  operating_system?: string
  panel_url?: string
  monthly_cost?: number
  currency?: string
  renewal_date?: string
  notes?: string
  owner?: "SpiderWorks" | "client" | "thirdparty"
}

export interface CreateContractPayload {
  client_id: string
  contract_number?: string
  billing_cycle: string
  start_date: string
  end_date: string
  renewal_date: string
  amount: number
  currency?: string
  auto_renew?: boolean
  scope?: string
  status?: string
}

export interface ServerListItem {
  id: string
  provider_id: string
  label: string
  ip_addresses: string[]
  region?: string | null
  operating_system?: string | null
  panel_url?: string | null
  monthly_cost?: string | null
  currency?: string | null
  renewal_date?: string | null
  notes?: string | null
  owner: "SpiderWorks" | "client" | "thirdparty"
  created_at: string
  updated_at: string
  asset_count: number
  provider_name: string
  provider_type: string
}

export interface DomainDetail extends DomainListItem {
  sslCertificates: Array<{
    id: string
    domain_id: string
    asset_id?: string | null
    issuer?: string | null
    common_name?: string | null
    sans: string[]
    valid_from?: string | null
    valid_to?: string | null
    type?: string | null
    last_checked_at?: string | null
    created_at: string
    updated_at: string
  }>
  snapshots: Array<{
    id: string
    domain_id: string
    registrar?: string | null
    expiry_date?: string | null
    nameservers: string[]
    checked_at: string
  }>
}

export interface DomainListItem {
  id: string
  asset_id: string
  fqdn: string
  registrar_id?: string | null
  registered_date?: string | null
  expiry_date?: string | null
  auto_renew: boolean
  nameservers: string[]
  notes?: string | null
  last_checked_at?: string | null
  created_at: string
  updated_at: string
  asset_name: string
  registrar_name?: string | null
  ssl_count: number
  days_to_expiry: number | null
}

export interface Provider {
  id: string
  name: string
  type: string
  website?: string | null
  notes?: string | null
}

export interface ServerDetail extends ServerListItem {
  provider_name: string
  provider_type: string
  provider_website?: string | null
  assets: Array<{
    id: string
    name: string
    status: string
    type_name: string
  }>
}

export interface SslDetail extends SslListItem {
  domain_expiry_date?: string | null
  snapshots: Array<{
    id: string
    ssl_id: string
    issuer?: string | null
    valid_from?: string | null
    valid_to?: string | null
    checked_at: string
  }>
}

export interface SslListItem {
  id: string
  domain_id: string
  asset_id?: string | null
  issuer?: string | null
  common_name?: string | null
  sans: string[]
  valid_from?: string | null
  valid_to?: string | null
  type?: string | null
  last_checked_at?: string | null
  created_at: string
  updated_at: string
  domain_fqdn: string
  asset_name?: string | null
  days_to_expiry: number | null
  is_self_signed?: boolean
  hostname_mismatch?: boolean
}

export interface CreateDomainPayload {
  asset_id: string
  fqdn: string
  registrar_id?: string
  registered_date?: string
  expiry_date?: string
  auto_renew?: boolean
  nameservers?: string[]
  notes?: string
}

export interface CreateSslPayload {
  domain_id: string
  asset_id?: string
  issuer?: string
  common_name?: string
  sans?: string[]
  valid_from?: string
  valid_to?: string
  type?: string
}

export interface UpdateDomainPayload {
  fqdn?: string
  registrar_id?: string
  registered_date?: string
  expiry_date?: string
  auto_renew?: boolean
  nameservers?: string[]
  notes?: string
}

export interface UpdateSslPayload {
  domain_id?: string
  asset_id?: string
  issuer?: string
  common_name?: string
  sans?: string[]
  valid_from?: string
  valid_to?: string
  type?: string
}

export interface UpdateContractPayload {
  contract_number?: string
  billing_cycle?: string
  start_date?: string
  end_date?: string
  renewal_date?: string
  amount?: number
  currency?: string
  auto_renew?: boolean
  scope?: string
  status?: string
}

export interface UpdateAssetPayload {
  name?: string
  status?: string
  primary_contact_name?: string
  primary_contact_email?: string
  monitoring_enabled?: boolean
  tech_stack?: string[]
  custom_fields?: Record<string, unknown>
  tags?: string[]
  notes?: string
}

export interface UpdateServerPayload {
  provider_id?: string
  label?: string
  ip_addresses?: string[]
  region?: string
  operating_system?: string
  panel_url?: string
  monthly_cost?: number
  currency?: string
  renewal_date?: string
  notes?: string
  owner?: "SpiderWorks" | "client" | "thirdparty"
}

export type MonitorCheckType = "http" | "https" | "tcp" | "ping" | "keyword"

export type MonitorCurrentStatus = "up" | "down" | "unknown"

export interface MonitorListItem {
  id: string
  name: string
  check_type: MonitorCheckType
  target: string
  interval_seconds: number
  current_status: MonitorCurrentStatus
  enabled: boolean
  last_checked_at: string | null
  asset_id: string
  asset_name: string
  created_at: string
  updated_at: string
}

export interface MonitorDetail extends MonitorListItem {
  expected_status_code: number | null
  expected_keyword: string | null
  recent_checks: MonitorCheck[]
  account_managers: AccountManager[]
}

export interface MonitorCheck {
  id: string
  monitor_id: string
  status_code: number | null
  response_time_ms: number | null
  error_message: string | null
  status: MonitorCurrentStatus
  checked_at: string
}

export interface CreateMonitorPayload {
  asset_id: string
  name: string
  check_type: MonitorCheckType
  target: string
  interval_seconds?: number
  expected_status_code?: number
  expected_keyword?: string
  enabled?: boolean
}

export interface UpdateMonitorPayload {
  name?: string
  asset_id?: string
  check_type?: MonitorCheckType
  target?: string
  interval_seconds?: number
  expected_status_code?: number
  expected_keyword?: string
  enabled?: boolean
}

export interface ListMonitorsParams {
  page?: number
  limit?: number
  search?: string
  asset_id?: string
  check_type?: string
  current_status?: string
  sort_by?: string
  sort_order?: "asc" | "desc"
}

export type IncidentSeverity = "critical" | "major" | "minor" | "info"

export interface IncidentListItem {
  id: string
  monitor_id: string | null
  severity: IncidentSeverity
  cause: string | null
  notes: string | null
  started_at: string
  resolved_at: string | null
  duration_seconds: number | null
  acknowledged_by: string | null
  acknowledged_by_name: string | null
  created_at: string
  monitor_name: string | null
  monitor_target: string | null
  monitor_check_type: string | null
  monitor_current_status: MonitorCurrentStatus | null
  asset_name: string | null
  asset_id: string | null
  target_type: string | null
  target_id: string | null
  domain_fqdn: string | null
  ssl_name: string | null
}

export interface IncidentDetail extends IncidentListItem {}

export interface ListIncidentsParams {
  page?: number
  limit?: number
  monitor_id?: string
  severity?: string
  status?: "open" | "resolved"
  sort_by?: string
  sort_order?: "asc" | "desc"
}

export interface AuditLogListItem {
  id: string
  actor_id: string | null
  actor_name: string | null
  actor_email: string | null
  entity_type: string
  entity_id: string
  action: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip: string | null
  created_at: string
}

export interface ListAuditLogsParams {
  page?: number
  limit?: number
  entity_type?: string
  entity_id?: string
  action?: string
  actor_id?: string
  date_from?: string
  date_to?: string
}

// ── Reminders ──

export type ReminderChannel = "email" | "whatsapp" | "sms" | "slack"

export type ReminderStatus = "pending" | "sent" | "acknowledged" | "escalated"

export type EventType = "domain_expiry" | "ssl_expiry" | "contract_expiry" | "server_expiry" | "incident"

export type TargetType = "domain" | "ssl" | "contract" | "server"

export interface ReminderListItem {
  id: string
  rule_id: string | null
  title: string
  message: string | null
  target_type: string
  target_id: string
  trigger_date: string
  channel: ReminderChannel
  status: ReminderStatus
  sent_at: string | null
  acknowledged_at: string | null
  created_at: string
}

export interface CreateReminderPayload {
  title: string
  message?: string
  target_type: string
  target_id: string
  trigger_date: string
  channel: string
  status?: string
  rule_id?: string
}

export interface UpdateReminderPayload {
  title?: string
  message?: string
  target_type?: string
  target_id?: string
  trigger_date?: string
  channel?: string
  status?: string
  rule_id?: string
}

export interface ListRemindersParams {
  page?: number
  limit?: number
  status?: string
  target_type?: string
}

export interface ReminderRuleListItem {
  id: string
  name: string
  event_type: string
  trigger_days: number[]
  channels: string[]
  recipients: Record<string, unknown> | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateReminderRulePayload {
  name: string
  event_type: string
  trigger_days: number[]
  channels: string[]
  recipients?: Record<string, unknown>
  enabled?: boolean
}

export interface UpdateReminderRulePayload {
  name?: string
  event_type?: string
  trigger_days?: number[]
  channels?: string[]
  recipients?: Record<string, unknown>
  enabled?: boolean
}

// ── Scopes ──

export interface Scope {
  id: string
  name: string
  description: string | null
  color: string
  asset_count?: number
  created_by_id: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  noteable_type: string
  noteable_id: string
  content: string
  created_by_id: string | null
  created_at: string
  updated_at: string
  author: { id: string; name: string; email: string } | null
}

// ── Users ──

export interface UserListItem {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface ListUsersParams {
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  sort_order?: "asc" | "desc"
}

// ── Queue Stats ──

export interface QueueStats {
  queues: Array<{
    name: string
    counts: {
      waiting: number
      active: number
      completed: number
      failed: number
      delayed: number
      paused: number
    }
    schedulers: Array<{
      id: string
      pattern: string | null
      next: string | null
    }>
  }>
  summary: {
    totalQueues: number
    totalFailed: number
    totalPending: number
    hasFailures: boolean
  }
}
