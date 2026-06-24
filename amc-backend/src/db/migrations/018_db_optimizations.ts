import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // ──────────────────────────────────────────────
  // 1. FIX FK CONSTRAINTS
  // ──────────────────────────────────────────────

  // 1a. incidents.monitor_id → monitors.id (FK was dropped in 011, re-add with CASCADE)
  // First, delete any incidents referencing deleted monitors (PG requires existing data to satisfy the constraint)
  await sql`
    DELETE FROM incidents
    WHERE monitor_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM monitors WHERE monitors.id = incidents.monitor_id)
  `.execute(db);
  await sql`
    ALTER TABLE incidents
    ADD CONSTRAINT incidents_monitor_id_fkey
    FOREIGN KEY (monitor_id) REFERENCES monitors(id)
    ON DELETE CASCADE
  `.execute(db);

  // 1b. client_contacts.created_by → users.id (was created without ON DELETE)
  await sql`
    ALTER TABLE client_contacts
    DROP CONSTRAINT IF EXISTS client_contacts_created_by_fkey
  `.execute(db);
  await sql`
    ALTER TABLE client_contacts
    ADD CONSTRAINT client_contacts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
  `.execute(db);

  // 1c. client_contacts.updated_by → users.id
  await sql`
    ALTER TABLE client_contacts
    DROP CONSTRAINT IF EXISTS client_contacts_updated_by_fkey
  `.execute(db);
  await sql`
    ALTER TABLE client_contacts
    ADD CONSTRAINT client_contacts_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL
  `.execute(db);

  // 1d. client_account_managers.created_by → users.id
  await sql`
    ALTER TABLE client_account_managers
    DROP CONSTRAINT IF EXISTS client_account_managers_created_by_fkey
  `.execute(db);
  await sql`
    ALTER TABLE client_account_managers
    ADD CONSTRAINT client_account_managers_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
  `.execute(db);

  // 1e. client_account_managers.updated_by → users.id
  await sql`
    ALTER TABLE client_account_managers
    DROP CONSTRAINT IF EXISTS client_account_managers_updated_by_fkey
  `.execute(db);
  await sql`
    ALTER TABLE client_account_managers
    ADD CONSTRAINT client_account_managers_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL
  `.execute(db);

  // ──────────────────────────────────────────────
  // 2. ADD MISSING INDEXES
  // ──────────────────────────────────────────────

  // 2a. FK column indexes (JOIN performance)
  await sql`CREATE INDEX IF NOT EXISTS idx_servers_provider_id ON servers (provider_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_ssl_certificates_domain_id ON ssl_certificates (domain_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_contract_renewals_contract_id ON contract_renewals (contract_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_domain_snapshots_domain_id ON domain_snapshots (domain_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_ssl_snapshots_ssl_id ON ssl_snapshots (ssl_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_notification_history_reminder_id ON notification_history (reminder_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_reminders_rule_id ON reminders (rule_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_asset_servers_server_id ON asset_servers (server_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_contract_assets_asset_id ON contract_assets (asset_id)`.execute(db);

  // 2b. Soft-delete indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON assets (deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients (deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at ON contracts (deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_cam_deleted_at ON client_account_managers (deleted_at)`.execute(db);

  // 2c. Composite soft-delete + FK (common query patterns)
  await sql`CREATE INDEX IF NOT EXISTS idx_assets_client_id_deleted_at ON assets (client_id, deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_contracts_client_id_deleted_at ON contracts (client_id, deleted_at)`.execute(db);

  // 2d. Type/status filter indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_service_providers_type ON service_providers (type)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_reminder_rules_event_type ON reminder_rules (event_type)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts (status)`.execute(db);

  // 2e. Target/status lookup indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_reminders_target ON reminders (target_type, target_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders (status)`.execute(db);

  // 2f. Date range query indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_contracts_renewal_date ON contracts (renewal_date)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts (end_date)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // ──────────────────────────────────────────────
  // Reverse indexes (DROP IF EXISTS)
  // ──────────────────────────────────────────────
  await sql`DROP INDEX IF EXISTS idx_contracts_end_date`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_contracts_renewal_date`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_reminders_status`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_reminders_target`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_contracts_status`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_reminder_rules_event_type`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_service_providers_type`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_contracts_client_id_deleted_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_assets_client_id_deleted_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_cam_deleted_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_contracts_deleted_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_clients_deleted_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_assets_deleted_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_contract_assets_asset_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_asset_servers_server_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_reminders_rule_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_notification_history_reminder_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_ssl_snapshots_ssl_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_domain_snapshots_domain_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_contract_renewals_contract_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_ssl_certificates_domain_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_servers_provider_id`.execute(db);

  // ──────────────────────────────────────────────
  // Reverse FK constraints — drop SET NULL versions,
  // restore original behavior from migrations 003/011
  // ──────────────────────────────────────────────

  // incidents.monitor_id → no FK (matching state after 011)
  await sql`ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_monitor_id_fkey`.execute(db);

  // client_contacts.created_by → users.id (no ON DELETE, matching 003)
  await sql`ALTER TABLE client_contacts DROP CONSTRAINT IF EXISTS client_contacts_created_by_fkey`.execute(db);
  await sql`
    ALTER TABLE client_contacts
    ADD CONSTRAINT client_contacts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id)
  `.execute(db);

  // client_contacts.updated_by → users.id (no ON DELETE, matching 003)
  await sql`ALTER TABLE client_contacts DROP CONSTRAINT IF EXISTS client_contacts_updated_by_fkey`.execute(db);
  await sql`
    ALTER TABLE client_contacts
    ADD CONSTRAINT client_contacts_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id)
  `.execute(db);

  // client_account_managers.created_by → users.id (no ON DELETE, matching 003)
  await sql`ALTER TABLE client_account_managers DROP CONSTRAINT IF EXISTS client_account_managers_created_by_fkey`.execute(db);
  await sql`
    ALTER TABLE client_account_managers
    ADD CONSTRAINT client_account_managers_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id)
  `.execute(db);

  // client_account_managers.updated_by → users.id (no ON DELETE, matching 003)
  await sql`ALTER TABLE client_account_managers DROP CONSTRAINT IF EXISTS client_account_managers_updated_by_fkey`.execute(db);
  await sql`
    ALTER TABLE client_account_managers
    ADD CONSTRAINT client_account_managers_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id)
  `.execute(db);
}
