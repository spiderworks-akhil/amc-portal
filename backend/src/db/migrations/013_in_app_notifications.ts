import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("in_app_notifications")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("type", "varchar(50)", (col) => col.notNull())
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("message", "text")
    .addColumn("link", "varchar(500)")
    .addColumn("severity", "varchar(20)", (col) =>
      col.notNull().defaultTo("info"),
    )
    .addColumn("is_read", "boolean", (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("idx_in_app_notifications_user_id")
    .on("in_app_notifications")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_in_app_notifications_user_unread")
    .on("in_app_notifications")
    .columns(["user_id", "is_read"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("in_app_notifications").execute();
}
