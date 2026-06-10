import { Kysely, sql } from "kysely";
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("avatar_url", "text")
    .addColumn("is_active", "boolean", (col) => col.notNull().defaultTo(true))
    .dropColumn("two_factor_enabled")
    .dropColumn("two_factor_secret")
    .execute();
}