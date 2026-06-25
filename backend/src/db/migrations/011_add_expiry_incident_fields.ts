import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Drop the FK constraint on monitor_id first (PostgreSQL needs explicit constraint name)
  await sql`ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_monitor_id_fkey`.execute(db);

  // Make monitor_id nullable
  await sql`ALTER TABLE incidents ALTER COLUMN monitor_id DROP NOT NULL`.execute(db);

  // Add target_type and target_id columns for non-monitor incidents (e.g., expired domains, SSL)
  await db.schema
    .alterTable("incidents")
    .addColumn("target_type", "varchar(20)")
    .execute();

  await db.schema
    .alterTable("incidents")
    .addColumn("target_id", "uuid")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Remove target columns
  await db.schema
    .alterTable("incidents")
    .dropColumn("target_id")
    .execute();

  await db.schema
    .alterTable("incidents")
    .dropColumn("target_type")
    .execute();

  // Restore NOT NULL on monitor_id
  await sql`ALTER TABLE incidents ALTER COLUMN monitor_id SET NOT NULL`.execute(db);

  // Restore FK constraint
  await sql`ALTER TABLE incidents ADD CONSTRAINT incidents_monitor_id_fkey FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE`.execute(db);
}
