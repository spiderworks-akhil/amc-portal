import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // TODO: write your migration
  await db.schema.alterTable("client_contacts")
    .addColumn("should_send_notification", "boolean", (col) => col.defaultTo(true))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // TODO: write your migration
  await db.schema.alterTable("client_contacts")
    .dropColumn("should_send_notification")
    .execute();
}
