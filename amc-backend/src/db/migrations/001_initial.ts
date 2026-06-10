import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // -- 1. users --
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(255)", (c) => c.notNull())
    .addColumn("email", "varchar(255)", (c) => c.notNull().unique())
    .addColumn("password_hash", "varchar(255)", (c) => c.notNull())
    .addColumn("role", "varchar(20)", (c) => c.notNull().defaultTo("staff"))
    .addColumn("status", "varchar(20)", (c) => c.notNull().defaultTo("active"))
    .addColumn("last_login_at", "timestamptz")
    .addColumn("two_factor_enabled", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("two_factor_secret", "varchar(255)")
    .addColumn("notification_prefs", "jsonb")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // -- 2. asset_types --
  await db.schema
    .createTable("asset_types")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(100)", (c) => c.notNull().unique())
    .addColumn("description", "text")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // -- 3. clients --
  await db.schema
    .createTable("clients")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(255)", (c) => c.notNull())
    .addColumn("company", "varchar(255)")
    .addColumn("email", "varchar(255)")
    .addColumn("phone", "varchar(50)")
    .addColumn("address", "text")
    .addColumn("status", "varchar(20)", (c) => c.notNull().defaultTo("active"))
    .addColumn("tags", sql`varchar(255)[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("custom_fields", "jsonb")
    .addColumn("account_manager_id", "uuid", (c) =>
      c.references("users.id").onDelete("set null")
    )
    .addColumn("notes", "text")
    .addColumn("deleted_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_clients_account_manager")
    .on("clients")
    .column("account_manager_id")
    .execute();

  // -- 4. client_contacts --
  await db.schema
    .createTable("client_contacts")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("client_id", "uuid", (c) =>
      c.references("clients.id").onDelete("cascade").notNull()
    )
    .addColumn("name", "varchar(255)", (c) => c.notNull())
    .addColumn("designation", "varchar(100)")
    .addColumn("email", "varchar(255)")
    .addColumn("phone", "varchar(50)")
    .addColumn("is_primary", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_client_contacts_client")
    .on("client_contacts")
    .column("client_id")
    .execute();

  // -- 5. service_providers --
  await db.schema
    .createTable("service_providers")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(255)", (c) => c.notNull())
    .addColumn("type", "varchar(50)", (c) => c.notNull())
    .addColumn("website", "text")
    .addColumn("notes", "text")
    .addColumn("created_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // -- 6. servers --
  await db.schema
    .createTable("servers")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("provider_id", "uuid", (c) =>
      c.references("service_providers.id").onDelete("restrict").notNull()
    )
    .addColumn("label", "varchar(255)", (c) => c.notNull())
    .addColumn("ip_addresses", sql`varchar(45)[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("region", "varchar(100)")
    .addColumn("operating_system", "varchar(100)")
    .addColumn("panel_url", "text")
    .addColumn("monthly_cost", "varchar(20)")
    .addColumn("currency", "varchar(3)", (c) => c.notNull().defaultTo("USD"))
    .addColumn("renewal_date", "date")
    .addColumn("notes", "text")
    .addColumn("created_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_servers_provider")
    .on("servers")
    .column("provider_id")
    .execute();

  // -- 7. assets --
  await db.schema
    .createTable("assets")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("client_id", "uuid", (c) =>
      c.references("clients.id").onDelete("restrict").notNull()
    )
    .addColumn("type_id", "uuid", (c) =>
      c.references("asset_types.id").onDelete("restrict").notNull()
    )
    .addColumn("name", "varchar(255)", (c) => c.notNull())
    .addColumn("primary_url", "text")
    .addColumn("status", "varchar(20)", (c) => c.notNull().defaultTo("live"))
    .addColumn("primary_contact_name", "varchar(255)")
    .addColumn("primary_contact_email", "varchar(255)")
    .addColumn("monitoring_enabled", "boolean", (c) => c.notNull().defaultTo(true))
    .addColumn("tech_stack", "jsonb")
    .addColumn("custom_fields", "jsonb")
    .addColumn("tags", sql`varchar(255)[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("notes", "text")
    .addColumn("deleted_at", "timestamptz")
    .addColumn("created_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_assets_client")
    .on("assets")
    .column("client_id")
    .execute();

  await db.schema
    .createIndex("idx_assets_type")
    .on("assets")
    .column("type_id")
    .execute();

  await db.schema
    .createIndex("idx_assets_status")
    .on("assets")
    .column("status")
    .execute();

  // -- 8. asset_servers (junction) --
  await db.schema
    .createTable("asset_servers")
    .addColumn("asset_id", "uuid", (c) =>
      c.references("assets.id").onDelete("cascade").notNull()
    )
    .addColumn("server_id", "uuid", (c) =>
      c.references("servers.id").onDelete("cascade").notNull()
    )
    .addPrimaryKeyConstraint("pk_asset_servers", ["asset_id", "server_id"])
    .execute();

  // -- 9. contracts --
  await db.schema
    .createTable("contracts")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("client_id", "uuid", (c) =>
      c.references("clients.id").onDelete("restrict").notNull()
    )
    .addColumn("contract_number", "varchar(100)")
    .addColumn("billing_cycle", "varchar(20)", (c) => c.notNull())
    .addColumn("start_date", "date", (c) => c.notNull())
    .addColumn("end_date", "date", (c) => c.notNull())
    .addColumn("renewal_date", "date", (c) => c.notNull())
    .addColumn("amount", "varchar(20)", (c) => c.notNull())
    .addColumn("currency", "varchar(3)", (c) => c.notNull().defaultTo("USD"))
    .addColumn("auto_renew", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("scope", "text")
    .addColumn("status", "varchar(20)", (c) => c.notNull().defaultTo("active"))
    .addColumn("deleted_at", "timestamptz")
    .addColumn("created_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_contracts_client")
    .on("contracts")
    .column("client_id")
    .execute();

  await db.schema
    .createIndex("idx_contracts_status")
    .on("contracts")
    .column("status")
    .execute();

  await db.schema
    .createIndex("idx_contracts_renewal")
    .on("contracts")
    .column("renewal_date")
    .execute();

  // -- 10. contract_assets (junction) --
  await db.schema
    .createTable("contract_assets")
    .addColumn("contract_id", "uuid", (c) =>
      c.references("contracts.id").onDelete("cascade").notNull()
    )
    .addColumn("asset_id", "uuid", (c) =>
      c.references("assets.id").onDelete("cascade").notNull()
    )
    .addPrimaryKeyConstraint("pk_contract_assets", ["contract_id", "asset_id"])
    .execute();

  // -- 11. contract_renewals --
  await db.schema
    .createTable("contract_renewals")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("contract_id", "uuid", (c) =>
      c.references("contracts.id").onDelete("cascade").notNull()
    )
    .addColumn("renewed_at", "timestamptz", (c) => c.notNull())
    .addColumn("previous_end_date", "date")
    .addColumn("new_start_date", "date")
    .addColumn("new_end_date", "date")
    .addColumn("amount", "varchar(20)")
    .addColumn("notes", "text")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_contract_renewals_contract")
    .on("contract_renewals")
    .column("contract_id")
    .execute();

  // -- 12. domains --
  await db.schema
    .createTable("domains")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("asset_id", "uuid", (c) =>
      c.references("assets.id").onDelete("cascade").notNull()
    )
    .addColumn("fqdn", "varchar(255)", (c) => c.notNull().unique())
    .addColumn("registrar_id", "uuid", (c) =>
      c.references("service_providers.id").onDelete("set null")
    )
    .addColumn("registered_date", "date")
    .addColumn("expiry_date", "date")
    .addColumn("auto_renew", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("nameservers", sql`varchar(255)[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("notes", "text")
    .addColumn("last_checked_at", "timestamptz")
    .addColumn("created_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_domains_asset")
    .on("domains")
    .column("asset_id")
    .execute();

  await db.schema
    .createIndex("idx_domains_expiry")
    .on("domains")
    .column("expiry_date")
    .execute();

  await db.schema
    .createIndex("idx_domains_registrar")
    .on("domains")
    .column("registrar_id")
    .execute();

  // -- 13. domain_snapshots --
  await db.schema
    .createTable("domain_snapshots")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("domain_id", "uuid", (c) =>
      c.references("domains.id").onDelete("cascade").notNull()
    )
    .addColumn("registrar", "varchar(255)")
    .addColumn("expiry_date", "date")
    .addColumn("nameservers", sql`varchar(255)[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("checked_at", "timestamptz", (c) => c.notNull())
    .execute();

  await db.schema
    .createIndex("idx_domain_snapshots_domain")
    .on("domain_snapshots")
    .column("domain_id")
    .execute();

  // -- 14. ssl_certificates --
  await db.schema
    .createTable("ssl_certificates")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("domain_id", "uuid", (c) =>
      c.references("domains.id").onDelete("cascade").notNull()
    )
    .addColumn("asset_id", "uuid", (c) =>
      c.references("assets.id").onDelete("set null")
    )
    .addColumn("issuer", "varchar(255)")
    .addColumn("common_name", "varchar(255)")
    .addColumn("sans", sql`varchar(255)[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("valid_from", "timestamptz")
    .addColumn("valid_to", "timestamptz")
    .addColumn("type", "varchar(20)")
    .addColumn("last_checked_at", "timestamptz")
    .addColumn("created_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_ssl_domain")
    .on("ssl_certificates")
    .column("domain_id")
    .execute();

  await db.schema
    .createIndex("idx_ssl_asset")
    .on("ssl_certificates")
    .column("asset_id")
    .execute();

  await db.schema
    .createIndex("idx_ssl_valid_to")
    .on("ssl_certificates")
    .column("valid_to")
    .execute();

  // -- 15. ssl_snapshots --
  await db.schema
    .createTable("ssl_snapshots")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("ssl_id", "uuid", (c) =>
      c.references("ssl_certificates.id").onDelete("cascade").notNull()
    )
    .addColumn("issuer", "varchar(255)")
    .addColumn("valid_from", "timestamptz")
    .addColumn("valid_to", "timestamptz")
    .addColumn("checked_at", "timestamptz", (c) => c.notNull())
    .execute();

  await db.schema
    .createIndex("idx_ssl_snapshots_ssl")
    .on("ssl_snapshots")
    .column("ssl_id")
    .execute();

  // -- 16. monitors --
  await db.schema
    .createTable("monitors")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("asset_id", "uuid", (c) =>
      c.references("assets.id").onDelete("cascade").notNull()
    )
    .addColumn("name", "varchar(255)", (c) => c.notNull())
    .addColumn("check_type", "varchar(20)", (c) => c.notNull())
    .addColumn("target", "text", (c) => c.notNull())
    .addColumn("interval_seconds", "integer", (c) => c.notNull().defaultTo(300))
    .addColumn("expected_status_code", "integer")
    .addColumn("expected_keyword", "varchar(255)")
    .addColumn("current_status", "varchar(20)", (c) => c.notNull().defaultTo("unknown"))
    .addColumn("enabled", "boolean", (c) => c.notNull().defaultTo(true))
    .addColumn("last_checked_at", "timestamptz")
    .addColumn("created_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("updated_by_id", "uuid", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_monitors_asset")
    .on("monitors")
    .column("asset_id")
    .execute();

  // -- 17. monitor_checks --
  await db.schema
    .createTable("monitor_checks")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("monitor_id", "uuid", (c) =>
      c.references("monitors.id").onDelete("cascade").notNull()
    )
    .addColumn("status_code", "integer")
    .addColumn("response_time_ms", "integer")
    .addColumn("error_message", "text")
    .addColumn("status", "varchar(20)", (c) => c.notNull())
    .addColumn("checked_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_monitor_checks_monitor")
    .on("monitor_checks")
    .column("monitor_id")
    .execute();

  // -- 18. incidents --
  await db.schema
    .createTable("incidents")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("monitor_id", "uuid", (c) =>
      c.references("monitors.id").onDelete("cascade").notNull()
    )
    .addColumn("started_at", "timestamptz", (c) => c.notNull())
    .addColumn("resolved_at", "timestamptz")
    .addColumn("duration_seconds", "integer")
    .addColumn("cause", "text")
    .addColumn("severity", "varchar(20)", (c) => c.notNull().defaultTo("warning"))
    .addColumn("acknowledged_by", "uuid", (c) =>
      c.references("users.id").onDelete("set null")
    )
    .addColumn("notes", "text")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_incidents_monitor")
    .on("incidents")
    .column("monitor_id")
    .execute();

  // -- 19. reminder_rules --
  await db.schema
    .createTable("reminder_rules")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(255)", (c) => c.notNull())
    .addColumn("event_type", "varchar(50)", (c) => c.notNull())
    .addColumn("trigger_days", sql`integer[]`, (c) => c.notNull().defaultTo(sql`'{}'`))
    .addColumn("channels", sql`varchar(20)[]`, (c) => c.notNull().defaultTo(sql`'{email}'`))
    .addColumn("recipients", "jsonb")
    .addColumn("enabled", "boolean", (c) => c.notNull().defaultTo(true))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // -- 20. reminders --
  await db.schema
    .createTable("reminders")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("rule_id", "uuid", (c) =>
      c.references("reminder_rules.id").onDelete("set null")
    )
    .addColumn("title", "varchar(255)", (c) => c.notNull())
    .addColumn("message", "text")
    .addColumn("target_type", "varchar(50)", (c) => c.notNull())
    .addColumn("target_id", "uuid", (c) => c.notNull())
    .addColumn("trigger_date", "date", (c) => c.notNull())
    .addColumn("channel", "varchar(20)", (c) => c.notNull())
    .addColumn("status", "varchar(20)", (c) => c.notNull().defaultTo("pending"))
    .addColumn("sent_at", "timestamptz")
    .addColumn("acknowledged_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_reminders_rule")
    .on("reminders")
    .column("rule_id")
    .execute();

  await db.schema
    .createIndex("idx_reminders_trigger")
    .on("reminders")
    .column("trigger_date")
    .execute();

  // -- 21. notification_history --
  await db.schema
    .createTable("notification_history")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("reminder_id", "uuid", (c) =>
      c.references("reminders.id").onDelete("cascade").notNull()
    )
    .addColumn("recipient", "varchar(255)", (c) => c.notNull())
    .addColumn("channel", "varchar(20)", (c) => c.notNull())
    .addColumn("status", "varchar(20)", (c) => c.notNull())
    .addColumn("provider_message_id", "varchar(255)")
    .addColumn("sent_at", "timestamptz", (c) => c.notNull())
    .addColumn("delivered_at", "timestamptz")
    .addColumn("failed_at", "timestamptz")
    .execute();

  await db.schema
    .createIndex("idx_notification_history_reminder")
    .on("notification_history")
    .column("reminder_id")
    .execute();

  // -- 22. audit_logs --
  await db.schema
    .createTable("audit_logs")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("actor_id", "uuid", (c) =>
      c.references("users.id").onDelete("set null")
    )
    .addColumn("entity_type", "varchar(50)", (c) => c.notNull())
    .addColumn("entity_id", "uuid", (c) => c.notNull())
    .addColumn("action", "varchar(20)", (c) => c.notNull())
    .addColumn("before", "jsonb")
    .addColumn("after", "jsonb")
    .addColumn("ip", "varchar(45)")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("idx_audit_logs_entity")
    .on("audit_logs")
    .columns(["entity_type", "entity_id"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  const tables = [
    "notification_history",
    "reminders",
    "reminder_rules",
    "audit_logs",
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
    "assets",
    "servers",
    "service_providers",
    "client_contacts",
    "clients",
    "asset_types",
    "users",
  ];

  for (const table of tables) {
    await db.schema.dropTable(table).ifExists().execute();
  }
}
