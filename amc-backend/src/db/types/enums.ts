export type UserRole = "staff" | "client";

export type UserStatus =
  | "active"
  | "inactive";

export enum AssetType {
  WEBSITE = "website",
  LANDING_PAGE = "landing_page",
  MOBILE_APPLICATION = "mobile_application",
}

export type AssetStatus =
  | "live"
  | "staging"
  | "development"
  | "parked";

export enum BillingCycle {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
  CUSTOM = "custom",
}

export enum ContractStatus {
  ACTIVE = "active",
  EXPIRING = "expiring",
  EXPIRED = "expired",
}

export enum ProviderType {
  CLOUD = "cloud",
  HOSTING = "hosting",
  REGISTRAR = "registrar",
  CDN = "cdn",
  EMAIL = "email",
}

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

export enum SslType {
  DV = "dv",
  OV = "ov",
  EV = "ev",
  WILDCARD = "wildcard",
}

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