import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("asset_types")
    .addColumn("is_active", "boolean", (col) => col.notNull().defaultTo(true))
    .execute();

  await db.schema
    .alterTable("asset_types")
    .addUniqueConstraint("uq_asset_types_name", ["name"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("asset_types")
    .dropConstraint("uq_asset_types_name")
    .execute();

  await db.schema
    .alterTable("asset_types")
    .dropColumn("is_active")
    .execute();
}
