import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("phone", "varchar(50)")
    .execute();

    await db.schema
      .alterTable("client_contacts")
      .addColumn("should_send_wp_notification", "boolean")
      .addColumn("send_recurring_notification", "boolean")
      .execute();

      await db.schema
      .alterTable("reminders")
      .addColumn("failure_reason", "varchar(255)")
      .execute();
} 

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .dropColumn("phone")
    .execute();
    await db.schema
      .alterTable("client_contacts")
      .dropColumn("should_send_wp_notification")
      .dropColumn("send_recurring_notification")
      .execute();
      await db.schema
      .alterTable("reminders")
      .dropColumn("failure_reason")
      .execute();
}
