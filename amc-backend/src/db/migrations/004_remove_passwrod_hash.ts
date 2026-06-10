import { Kysely, sql } from "kysely";
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .dropColumn("password_hash")
    .execute();
}