import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("client_contacts")
    .alterColumn("should_send_notification", (ac) => ac.setDefault(false))
    .execute();

  await db.schema
    .alterTable("client_contacts")
    .alterColumn("should_send_wp_notification", (ac) => ac.setDefault(false))
    .execute();

  await sql`
    UPDATE client_contacts
    SET should_send_notification = false
    WHERE should_send_notification IS NULL
  `.execute(db);

  await sql`
    UPDATE client_contacts
    SET should_send_wp_notification = false
    WHERE should_send_wp_notification IS NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("client_contacts")
    .alterColumn("should_send_notification", (ac) => ac.dropDefault())
    .execute();

  await db.schema
    .alterTable("client_contacts")
    .alterColumn("should_send_wp_notification", (ac) => ac.dropDefault())
    .execute();
}
