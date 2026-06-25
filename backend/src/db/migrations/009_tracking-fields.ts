import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Domains
  await db.schema
    .alterTable("domains")
    .addColumn("health_status", "varchar(20)", (col) =>
      col.notNull().defaultTo("UNKNOWN")
    )
    .addColumn("health_reason", "text")
    .addColumn("dns_status", "varchar(20)", (col) =>
      col.notNull().defaultTo("UNKNOWN")
    )
    .addColumn("website_status", "varchar(20)", (col) =>
      col.notNull().defaultTo("UNKNOWN")
    )
    .addColumn("ssl_status", "varchar(20)", (col) =>
      col.notNull().defaultTo("UNKNOWN")
    )
    .addColumn("last_health_check_at", "timestamptz")
    .execute();
  await db.schema.alterTable("contracts")
    .addColumn("notes", "text")
    .execute();
  // SSL Certificates
  await db.schema
    .alterTable("ssl_certificates")
    .addColumn("health_status", "varchar(20)", (col) =>
      col.notNull().defaultTo("UNKNOWN")
    )
    .addColumn("health_reason", "text")
    .addColumn("days_until_expiry", "integer")
    .execute();

  // Domain indexes
  await sql`
    CREATE INDEX IF NOT EXISTS idx_domains_health_status
    ON domains (health_status)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_domains_last_health_check_at
    ON domains (last_health_check_at)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_domains_expiry_date
    ON domains (expiry_date)
  `.execute(db);

  // SSL indexes
  await sql`
    CREATE INDEX IF NOT EXISTS idx_ssl_health_status
    ON ssl_certificates (health_status)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ssl_valid_to
    ON ssl_certificates (valid_to)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ssl_last_checked_at
    ON ssl_certificates (last_checked_at)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // SSL indexes
  await sql`
    DROP INDEX IF EXISTS idx_ssl_last_checked_at
  `.execute(db);

  await sql`
    DROP INDEX IF EXISTS idx_ssl_valid_to
  `.execute(db);

  await sql`
    DROP INDEX IF EXISTS idx_ssl_health_status
  `.execute(db);

  // Domain indexes
  await sql`
    DROP INDEX IF EXISTS idx_domains_expiry_date
  `.execute(db);

  await sql`
    DROP INDEX IF EXISTS idx_domains_last_health_check_at
  `.execute(db);

  await sql`
    DROP INDEX IF EXISTS idx_domains_health_status
  `.execute(db);

  // SSL columns
  await db.schema
    .alterTable("ssl_certificates")
    .dropColumn("days_until_expiry")
    .dropColumn("health_reason")
    .dropColumn("health_status")
    .execute();

  // Domain columns
  await db.schema
    .alterTable("domains")
    .dropColumn("last_health_check_at")
    .dropColumn("ssl_status")
    .dropColumn("website_status")
    .dropColumn("dns_status")
    .dropColumn("health_reason")
    .dropColumn("health_status")
    .execute();
}