import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("notification_history")
    .addColumn("failure_reason", "varchar(500)")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("notification_history")
    .dropColumn("failure_reason")
    .execute();
}
