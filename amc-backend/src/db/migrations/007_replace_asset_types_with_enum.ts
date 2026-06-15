import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("assets")
    .addColumn("type", "varchar(50)", (col) => col.notNull().defaultTo("website"))
    .execute();

  await sql`
    UPDATE assets
    SET type = CASE
      WHEN (SELECT name FROM asset_types WHERE asset_types.id = assets.type_id) IN ('landing page', 'landing_page') THEN 'landing_page'
      WHEN (SELECT name FROM asset_types WHERE asset_types.id = assets.type_id) IN ('mobile application', 'mobile app', 'mobile_application') THEN 'mobile_application'
      ELSE 'website'
    END
  `.execute(db);

  await db.schema
    .alterTable("assets")
    .dropConstraint("assets_type_id_fkey")
    .execute();

  await db.schema
    .alterTable("assets")
    .dropColumn("type_id")
    .execute();

  await db.schema
    .dropTable("asset_types")
    .execute();

  await sql`
    ALTER TABLE assets
    ADD CONSTRAINT chk_assets_type
    CHECK (type IN ('website', 'landing_page', 'mobile_application'))
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("asset_types")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("is_active", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  for (const name of ["website", "landing_page", "mobile_application"]) {
    await sql`INSERT INTO asset_types (name) VALUES (${name})`.execute(db);
  }

  await db.schema
    .alterTable("assets")
    .addColumn("type_id", "uuid", (col) => col.references("asset_types.id").onDelete("restrict"))
    .execute();

  await sql`
    UPDATE assets
    SET type_id = (SELECT id FROM asset_types WHERE asset_types.name = assets.type)
  `.execute(db);

  await sql`ALTER TABLE assets ALTER COLUMN type_id SET NOT NULL`.execute(db);

  await sql`ALTER TABLE assets DROP CONSTRAINT chk_assets_type`.execute(db);

  await db.schema
    .alterTable("assets")
    .dropColumn("type")
    .execute();
}
