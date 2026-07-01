import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Make the columns nullable
  await db.schema
    .alterTable("contracts")
    .alterColumn("renewal_date", (col) => col.dropNotNull())
    .alterColumn("end_date", (col) => col.dropNotNull())
    .execute();

  // Set existing values to NULL
  await sql`
    UPDATE contracts
    SET
      renewal_date = NULL,
      end_date = NULL
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  throw new Error(
    "Irreversible migration: renewal_date and end_date values were permanently set to NULL."
  );
}