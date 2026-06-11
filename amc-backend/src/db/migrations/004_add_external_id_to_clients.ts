import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add external_id column — proper indexed key for reconciliation
  // with external source-of-truth API (replaces fragile JSONB lookup)
  await db.schema
    .alterTable("clients")
    .addColumn("external_id", "varchar(255)")
    .execute();

  // Backfill from existing custom_fields JSONB
  await sql`
    UPDATE clients
    SET external_id = custom_fields->>'externalId'
    WHERE custom_fields->>'externalId' IS NOT NULL
  `.execute(db);

  // Partial unique index (allows multiple nulls, enforces uniqueness on non-null)
  await sql`
    CREATE UNIQUE INDEX clients_external_id_unique_idx
    ON clients (external_id)
    WHERE external_id IS NOT NULL
  `.execute(db);
}
