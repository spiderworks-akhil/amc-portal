import { Kysely, sql } from "kysely";
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("remote_user_id", "bigint", (col) => col.notNull().unique())
    .execute();
}