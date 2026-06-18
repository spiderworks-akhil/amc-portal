import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("incidents")
    .addColumn("created_by_id", "uuid", (col) =>
      col.references("users.id").onDelete("set null"),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("incidents")
    .dropColumn("created_by_id")
    .execute();
}
