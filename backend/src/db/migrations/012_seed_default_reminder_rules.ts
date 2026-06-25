import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  const now = new Date().toISOString();

  // Domain expiry: send email 30, 14, 7, and 1 day before
  await sql`
    INSERT INTO reminder_rules (id, name, event_type, trigger_days, channels, recipients, enabled, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'Domain Expiry Notice', 'domain_expiry', '[30, 14, 7, 1]'::jsonb, '["email"]'::jsonb, NULL, true, ${now}, ${now})
  `.execute(db);

  // SSL expiry: send email 30, 14, and 7 days before
  await sql`
    INSERT INTO reminder_rules (id, name, event_type, trigger_days, channels, recipients, enabled, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'SSL Certificate Expiry Notice', 'ssl_expiry', '[30, 14, 7]'::jsonb, '["email"]'::jsonb, NULL, true, ${now}, ${now})
  `.execute(db);

  // Contract expiry: send email 60, 30, 14, and 7 days before
  await sql`
    INSERT INTO reminder_rules (id, name, event_type, trigger_days, channels, recipients, enabled, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'Contract Renewal Notice', 'contract_expiry', '[60, 30, 14, 7]'::jsonb, '["email"]'::jsonb, NULL, true, ${now}, ${now})
  `.execute(db);

  // Server renewal: send email 30, 14, and 7 days before renewal
  await sql`
    INSERT INTO reminder_rules (id, name, event_type, trigger_days, channels, recipients, enabled, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'Server Renewal Notice', 'server_expiry', '[30, 14, 7]'::jsonb, '["email"]'::jsonb, NULL, true, ${now}, ${now})
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Remove all seeded default rules
  await sql`
    DELETE FROM reminder_rules
    WHERE name IN (
      'Domain Expiry Notice',
      'SSL Certificate Expiry Notice',
      'Contract Renewal Notice',
      'Server Renewal Notice'
    )
  `.execute(db);
}
