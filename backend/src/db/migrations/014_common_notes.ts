import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("notes")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("noteable_type", "varchar(50)", (col) => col.notNull())
    .addColumn("noteable_id", "uuid", (col) => col.notNull())
    .addColumn("content", "text", (col) => col.notNull())
    .addColumn("created_by_id", "uuid", (col) =>
      col.references("users.id").onDelete("set null"),
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // Index for looking up notes by entity (polymorphic)
  await db.schema
    .createIndex("idx_notes_noteable")
    .on("notes")
    .columns(["noteable_type", "noteable_id"])
    .execute();

  // Index for reverse lookup by type
  await db.schema
    .createIndex("idx_notes_noteable_type")
    .on("notes")
    .column("noteable_type")
    .execute();

  // Index for ordering by creation date
  await db.schema
    .createIndex("idx_notes_created_at")
    .on("notes")
    .column("created_at")
    .execute();
     await db.schema
    .createTable("scopes")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("color", "varchar(7)", (col) =>
      col.notNull().defaultTo("#6366f1"),
    )
    .addColumn("created_by_id", "uuid", (col) =>
      col.references("users.id").onDelete("set null"),
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("idx_scopes_name")
    .on("scopes")
    .column("name")
    .execute();

  // ── 2. ASSET ↔ SCOPES (junction) ──
  await db.schema
    .createTable("asset_scopes")
    .addColumn("asset_id", "uuid", (col) =>
      col.notNull().references("assets.id").onDelete("cascade"),
    )
    .addColumn("scope_id", "uuid", (col) =>
      col.notNull().references("scopes.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("pk_asset_scopes", ["asset_id", "scope_id"])
    .execute();

  await db.schema
    .createIndex("idx_asset_scopes_scope_id")
    .on("asset_scopes")
    .column("scope_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("notes").execute();
  await db.schema.dropTable("asset_scopes").execute();
  await db.schema.dropTable("scopes").execute();
}
