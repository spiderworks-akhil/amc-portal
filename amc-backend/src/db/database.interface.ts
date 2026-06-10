import { NotificationHistory } from './types/notification-history.table';
import { RevokedTokens } from "./types/revoked-tokens.table";
import { Users } from "./types/users.table";
import { Clients } from "./types/clients.table";
import { ClientContacts } from "./types/client-contacts.table";
import { AssetTypes } from "./types/asset-types.table";
import { Assets } from "./types/assets.table";
import { AssetServers } from "./types/asset-servers.table";

import { Contracts } from "./types/contracts.table";
import { ContractAssets } from "./types/contract-assets.table";
import { ContractRenewals } from "./types/contract-renewals.table";

import { ServiceProviders } from "./types/providers.table";
import { Servers } from "./types/servers.table";

import { Domains } from "./types/domains.table";
import { DomainSnapshots } from "./types/domain-snapshots.table";

import { SslCertificates } from "./types/ssl-certificates.table";
import { SslSnapshots } from "./types/ssl-snapshots.table";

import { MonitorChecks } from "./types/monitor-checks.table";
import { Incidents } from "./types/incidents.table";

import { ReminderRules } from "./types/reminder-rules.table";
import { Reminders } from "./types/reminders.table";

import { AuditLogs } from "./types/audit-logs.table";
import { Monitors } from "./types/monitors.table";

export interface DB {
  revoked_tokens: RevokedTokens;
  users: Users;
  clients: Clients;
  client_contacts: ClientContacts;
  asset_types: AssetTypes;
  assets: Assets;
  asset_servers: AssetServers;
  contracts: Contracts;
  contract_assets: ContractAssets;
  contract_renewals: ContractRenewals;
  service_providers: ServiceProviders;
  servers: Servers;
  domains: Domains;
  domain_snapshots: DomainSnapshots;
  ssl_certificates: SslCertificates;
  ssl_snapshots: SslSnapshots;
  monitors: Monitors;
  monitor_checks: MonitorChecks;
  incidents: Incidents;
  reminder_rules: ReminderRules;
  reminders: Reminders;
  audit_logs: AuditLogs;
  notification_history: NotificationHistory;
}