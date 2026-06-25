import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE contracts ALTER COLUMN amount DROP NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE contracts ALTER COLUMN amount SET NOT NULL
  `.execute(db);
}
