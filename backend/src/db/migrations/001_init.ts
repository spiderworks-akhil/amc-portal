import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // ──────────────────────────────────────────────
  // 1. USERS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("password_hash", "varchar(255)")
    .addColumn("avatar_url", "text")
    .addColumn("remote_user_id", "bigint")
    .addColumn("role", "varchar(20)", (col) => col.notNull().defaultTo("staff"))
    .addColumn("is_active", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("last_login_at", "timestamptz")
    .addColumn("notification_prefs", "jsonb")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 2. REVOKED TOKENS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("revoked_tokens")
    .addColumn("jti", "varchar(255)", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 3. CLIENTS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("clients")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("company", "varchar(255)")
    .addColumn("email", "varchar(255)")
    .addColumn("phone", "varchar(50)")
    .addColumn("address", "text")
    .addColumn("is_active", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("custom_fields", "jsonb")
    .addColumn("notes", "text")
    .addColumn("deleted_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 4. TAGS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("tags")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(100)", (col) => col.notNull().unique())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 5. CLIENT TAGS  (many-to-many junction)
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("client_tags")
    .addColumn("client_id", "uuid", (col) =>
      col.notNull().references("clients.id").onDelete("cascade"),
    )
    .addColumn("tag_id", "uuid", (col) =>
      col.notNull().references("tags.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("pk_client_tags", ["client_id", "tag_id"])
    .execute();

  await db.schema
    .createIndex("idx_client_tags_tag_id")
    .on("client_tags")
    .column("tag_id")
    .execute();

  // ──────────────────────────────────────────────
  // 6. CLIENT CONTACTS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("client_contacts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("client_id", "uuid", (col) =>
      col.notNull().references("clients.id").onDelete("cascade"),
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("designation", "varchar(255)")
    .addColumn("email", "varchar(255)")
    .addColumn("phone", "varchar(50)")
    .addColumn("is_primary", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_client_contacts_client_id")
    .on("client_contacts")
    .column("client_id")
    .execute();

  // ──────────────────────────────────────────────
  // 7. CLIENT ACCOUNT MANAGERS  (many-to-many junction)
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("client_account_managers")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("client_id", "uuid", (col) =>
      col.notNull().references("clients.id").onDelete("cascade"),
    )
    .addColumn("manager_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("deleted_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Prevent duplicate manager assignments to the same client
  await db.schema
    .createIndex("idx_cam_client_manager_unique")
    .on("client_account_managers")
    .columns(["client_id", "manager_id"])
    .unique()
    .execute();

  await db.schema
    .createIndex("idx_cam_manager_id")
    .on("client_account_managers")
    .column("manager_id")
    .execute();

  // ──────────────────────────────────────────────
  // 6. ASSET TYPES
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("asset_types")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 7. ASSETS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("assets")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("client_id", "uuid", (col) =>
      col.notNull().references("clients.id").onDelete("cascade"),
    )
    .addColumn("type_id", "uuid", (col) =>
      col.notNull().references("asset_types.id").onDelete("restrict"),
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("primary_url", "text")
    .addColumn("status", "varchar(20)", (col) => col.notNull().defaultTo("live"))
    .addColumn("primary_contact_name", "varchar(255)")
    .addColumn("primary_contact_email", "varchar(255)")
    .addColumn("monitoring_enabled", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("tech_stack", "jsonb")
    .addColumn("custom_fields", "jsonb")
    .addColumn("tags", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("notes", "text")
    .addColumn("deleted_at", "timestamptz")
    .addColumn("created_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_assets_client_id")
    .on("assets")
    .column("client_id")
    .execute();

  // ──────────────────────────────────────────────
  // 8. SERVICE PROVIDERS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("service_providers")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("type", "varchar(20)", (col) => col.notNull())
    .addColumn("website", "text")
    .addColumn("notes", "text")
    .addColumn("created_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 9. SERVERS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("servers")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("provider_id", "uuid", (col) =>
      col.notNull().references("service_providers.id").onDelete("restrict"),
    )
    .addColumn("label", "varchar(255)", (col) => col.notNull())
    .addColumn("ip_addresses", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("region", "varchar(255)")
    .addColumn("operating_system", "varchar(255)")
    .addColumn("panel_url", "text")
    .addColumn("monthly_cost", sql`numeric(12,2)`)
    .addColumn("currency", "varchar(10)", (col) => col.notNull().defaultTo("USD"))
    .addColumn("renewal_date", "timestamptz")
    .addColumn("notes", "text")
    .addColumn("created_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 10. ASSET ↔ SERVERS  (junction)
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("asset_servers")
    .addColumn("asset_id", "uuid", (col) =>
      col.notNull().references("assets.id").onDelete("cascade"),
    )
    .addColumn("server_id", "uuid", (col) =>
      col.notNull().references("servers.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("pk_asset_servers", ["asset_id", "server_id"])
    .execute();

  // ──────────────────────────────────────────────
  // 11. CONTRACTS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("contracts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("client_id", "uuid", (col) =>
      col.notNull().references("clients.id").onDelete("cascade"),
    )
    .addColumn("contract_number", "varchar(100)")
    .addColumn("billing_cycle", "varchar(20)", (col) => col.notNull())
    .addColumn("start_date", "timestamptz", (col) => col.notNull())
    .addColumn("end_date", "timestamptz", (col) => col.notNull())
    .addColumn("renewal_date", "timestamptz", (col) => col.notNull())
    .addColumn("amount", sql`numeric(12,2)`, (col) => col.notNull())
    .addColumn("currency", "varchar(10)", (col) => col.notNull().defaultTo("USD"))
    .addColumn("auto_renew", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("scope", "text")
    .addColumn("status", "varchar(20)", (col) => col.notNull().defaultTo("active"))
    .addColumn("deleted_at", "timestamptz")
    .addColumn("created_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_contracts_client_id")
    .on("contracts")
    .column("client_id")
    .execute();

  // ──────────────────────────────────────────────
  // 12. CONTRACT ASSETS  (junction)
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("contract_assets")
    .addColumn("contract_id", "uuid", (col) =>
      col.notNull().references("contracts.id").onDelete("cascade"),
    )
    .addColumn("asset_id", "uuid", (col) =>
      col.notNull().references("assets.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("pk_contract_assets", ["contract_id", "asset_id"])
    .execute();

  // ──────────────────────────────────────────────
  // 13. CONTRACT RENEWALS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("contract_renewals")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("contract_id", "uuid", (col) =>
      col.notNull().references("contracts.id").onDelete("cascade"),
    )
    .addColumn("renewed_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("previous_end_date", "timestamptz")
    .addColumn("new_start_date", "timestamptz")
    .addColumn("new_end_date", "timestamptz")
    .addColumn("amount", sql`numeric(12,2)`)
    .addColumn("notes", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 14. DOMAINS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("domains")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("asset_id", "uuid", (col) =>
      col.notNull().references("assets.id").onDelete("cascade"),
    )
    .addColumn("fqdn", "varchar(255)", (col) => col.notNull())
    .addColumn("registrar_id", "uuid", (col) =>
      col.references("service_providers.id").onDelete("set null"),
    )
    .addColumn("registered_date", "timestamptz")
    .addColumn("expiry_date", "timestamptz")
    .addColumn("auto_renew", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("nameservers", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("notes", "text")
    .addColumn("last_checked_at", "timestamptz")
    .addColumn("created_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_domains_asset_id")
    .on("domains")
    .column("asset_id")
    .execute();

  await db.schema
    .createIndex("idx_domains_fqdn")
    .on("domains")
    .column("fqdn")
    .execute();

  // ──────────────────────────────────────────────
  // 15. DOMAIN SNAPSHOTS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("domain_snapshots")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("domain_id", "uuid", (col) =>
      col.notNull().references("domains.id").onDelete("cascade"),
    )
    .addColumn("registrar", "varchar(255)")
    .addColumn("expiry_date", "timestamptz")
    .addColumn("nameservers", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("checked_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 16. SSL CERTIFICATES
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("ssl_certificates")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("domain_id", "uuid", (col) =>
      col.notNull().references("domains.id").onDelete("cascade"),
    )
    .addColumn("asset_id", "uuid", (col) => col.references("assets.id").onDelete("set null"))
    .addColumn("issuer", "varchar(255)")
    .addColumn("common_name", "varchar(255)")
    .addColumn("sans", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("valid_from", "timestamptz")
    .addColumn("valid_to", "timestamptz")
    .addColumn("type", "varchar(20)")
    .addColumn("last_checked_at", "timestamptz")
    .addColumn("created_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 17. SSL SNAPSHOTS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("ssl_snapshots")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("ssl_id", "uuid", (col) =>
      col.notNull().references("ssl_certificates.id").onDelete("cascade"),
    )
    .addColumn("issuer", "varchar(255)")
    .addColumn("valid_from", "timestamptz")
    .addColumn("valid_to", "timestamptz")
    .addColumn("checked_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 18. MONITORS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("monitors")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("asset_id", "uuid", (col) =>
      col.notNull().references("assets.id").onDelete("cascade"),
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("check_type", "varchar(20)", (col) => col.notNull())
    .addColumn("target", "text", (col) => col.notNull())
    .addColumn("interval_seconds", "integer", (col) => col.notNull().defaultTo(60))
    .addColumn("expected_status_code", "integer")
    .addColumn("expected_keyword", "text")
    .addColumn("current_status", "varchar(20)", (col) => col.notNull().defaultTo("unknown"))
    .addColumn("enabled", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("last_checked_at", "timestamptz")
    .addColumn("created_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_monitors_asset_id")
    .on("monitors")
    .column("asset_id")
    .execute();

  // ──────────────────────────────────────────────
  // 19. MONITOR CHECKS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("monitor_checks")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("monitor_id", "uuid", (col) =>
      col.notNull().references("monitors.id").onDelete("cascade"),
    )
    .addColumn("status_code", "integer")
    .addColumn("response_time_ms", "integer")
    .addColumn("error_message", "text")
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("checked_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_monitor_checks_monitor_id")
    .on("monitor_checks")
    .column("monitor_id")
    .execute();

  // ──────────────────────────────────────────────
  // 20. INCIDENTS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("incidents")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("monitor_id", "uuid", (col) =>
      col.notNull().references("monitors.id").onDelete("cascade"),
    )
    .addColumn("started_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("resolved_at", "timestamptz")
    .addColumn("duration_seconds", "integer")
    .addColumn("cause", "text")
    .addColumn("severity", "varchar(20)", (col) => col.notNull())
    .addColumn("acknowledged_by", "uuid", (col) =>
      col.references("users.id").onDelete("set null"),
    )
    .addColumn("notes", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_incidents_monitor_id")
    .on("incidents")
    .column("monitor_id")
    .execute();

  // ──────────────────────────────────────────────
  // 21. REMINDER RULES
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("reminder_rules")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("event_type", "varchar(50)", (col) => col.notNull())
    .addColumn("trigger_days", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("channels", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("recipients", "jsonb")
    .addColumn("enabled", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 22. REMINDERS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("reminders")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("rule_id", "uuid", (col) =>
      col.references("reminder_rules.id").onDelete("set null"),
    )
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("message", "text")
    .addColumn("target_type", "varchar(50)", (col) => col.notNull())
    .addColumn("target_id", "uuid", (col) => col.notNull())
    .addColumn("trigger_date", "timestamptz", (col) => col.notNull())
    .addColumn("channel", "varchar(20)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull().defaultTo("pending"))
    .addColumn("sent_at", "timestamptz")
    .addColumn("acknowledged_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // ──────────────────────────────────────────────
  // 23. NOTIFICATION HISTORY
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("notification_history")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("reminder_id", "uuid", (col) =>
      col.notNull().references("reminders.id").onDelete("cascade"),
    )
    .addColumn("recipient", "varchar(255)", (col) => col.notNull())
    .addColumn("channel", "varchar(20)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("provider_message_id", "varchar(255)")
    .addColumn("sent_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("delivered_at", "timestamptz")
    .addColumn("failed_at", "timestamptz")
    .execute();

  // ──────────────────────────────────────────────
  // 24. AUDIT LOGS
  // ──────────────────────────────────────────────
  await db.schema
    .createTable("audit_logs")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("actor_id", "uuid", (col) => col.references("users.id").onDelete("set null"))
    .addColumn("entity_type", "varchar(50)", (col) => col.notNull())
    .addColumn("entity_id", "uuid", (col) => col.notNull())
    .addColumn("action", "varchar(20)", (col) => col.notNull())
    .addColumn("before", "jsonb")
    .addColumn("after", "jsonb")
    .addColumn("ip", "varchar(45)")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_audit_logs_entity")
    .on("audit_logs")
    .columns(["entity_type", "entity_id"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Drop in reverse dependency order
  const tables = [
    "audit_logs",
    "notification_history",
    "reminders",
    "reminder_rules",
    "incidents",
    "monitor_checks",
    "monitors",
    "ssl_snapshots",
    "ssl_certificates",
    "domain_snapshots",
    "domains",
    "contract_renewals",
    "contract_assets",
    "contracts",
    "asset_servers",
    "servers",
    "service_providers",
    "assets",
    "asset_types",
    "client_account_managers",
    "client_tags",
    "tags",
    "client_contacts",
    "clients",
    "revoked_tokens",
    "users",
  ];

  for (const table of tables) {
    await db.schema.dropTable(table).ifExists().execute();
  }
}
