export type UserRole = "staff" | "client";

export type UserStatus =
  | "active"
  | "inactive";

export type AssetStatus =
  | "live"
  | "staging"
  | "development"
  | "parked";

export type BillingCycle =
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

export type ContractStatus =
  | "active"
  | "expiring"
  | "expired";

export type ProviderType =
  | "cloud"
  | "hosting"
  | "registrar"
  | "cdn"
  | "email";

export type MonitorType =
  | "http"
  | "https"
  | "tcp"
  | "ping"
  | "keyword";

export type MonitorStatus =
  | "up"
  | "down"
  | "unknown";

export type Severity =
  | "critical"
  | "major"
  | "minor"
  | "info";

export type SslType =
  | "dv"
  | "ov"
  | "ev"
  | "wildcard";

export type ReminderChannel =
  | "email"
  | "whatsapp"
  | "sms"
  | "slack";

export type ReminderStatus =
  | "pending"
  | "sent"
  | "acknowledged"
  | "escalated";

export type AuditAction =
  | "create"
  | "update"
  | "delete";

  export type EventType =
  | "domain_expiry"
  | "ssl_expiry"
  | "contract_expiry"
  | "server_expiry"
  | "incident";