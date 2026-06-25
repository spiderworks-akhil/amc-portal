import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    DELETE FROM users a USING users b
    WHERE a.id < b.id
      AND a.remote_user_id IS NOT NULL
      AND a.remote_user_id = b.remote_user_id
  `.execute(db);

  await db.schema
    .alterTable("users")
    .addUniqueConstraint("uq_users_remote_user_id", ["remote_user_id"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .dropConstraint("uq_users_remote_user_id")
    .execute();
}
