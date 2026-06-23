import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Create enums
  await sql`
    CREATE TYPE user_role AS ENUM ('user', 'admin')
  `.execute(db);

  await sql`
    CREATE TYPE owner_enum AS ENUM ('SpiderWorks', 'client', 'thirdparty')
  `.execute(db);

  // Convert users.role to enum
  await sql`
    ALTER TABLE users
    ALTER COLUMN role DROP DEFAULT
  `.execute(db);

  await sql`
    ALTER TABLE users
    ALTER COLUMN role TYPE user_role
    USING (
      CASE
        WHEN role = 'admin' THEN 'admin'::user_role
        ELSE 'user'::user_role
      END
    )
  `.execute(db);

  await sql`
    ALTER TABLE users
    ALTER COLUMN role SET DEFAULT 'user'::user_role
  `.execute(db);

  // Add owner column to servers
  await db.schema
    .alterTable("servers")
    .addColumn("owner", sql`owner_enum`, (col) =>
      col.notNull().defaultTo("client"),
    )
    .addColumn("remarks", "varchar(255)")
    .execute();

  // Contracts changes
  await db.schema
    .alterTable("contracts")
    .addColumn("label", "varchar(255)")
    .dropColumn("notes")
    .dropColumn("scope")
    .execute();

  // Assets changes
  await db.schema
    .alterTable("assets")
    .dropColumn("primary_url")
    .execute();

  // Create contract_scopes junction table
  await db.schema
    .createTable("contract_scopes")
    .addColumn("contract_id", "uuid", (col) =>
      col.notNull().references("contracts.id").onDelete("cascade"),
    )
    .addColumn("scope_id", "uuid", (col) =>
      col.notNull().references("scopes.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("contract_scopes_pk", ["contract_id", "scope_id"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Drop contract_scopes junction table
  await db.schema.dropTable("contract_scopes").execute();

  // Revert servers changes
  await db.schema
    .alterTable("servers")
    .dropColumn("owner")
    .dropColumn("remarks")
    .execute();

  // Revert assets changes
  await db.schema
    .alterTable("assets")
    .addColumn("primary_url", "text")
    .execute();

  // Revert contracts changes
  await db.schema
    .alterTable("contracts")
    .dropColumn("label")
    .addColumn("notes", "text")
    .addColumn("scopes", "text")
    .execute();

  // Revert users.role
  await sql`
    ALTER TABLE users
    ALTER COLUMN role DROP DEFAULT
  `.execute(db);

  await sql`
    ALTER TABLE users
    ALTER COLUMN role TYPE text
    USING role::text
  `.execute(db);

  // Drop enums
  await sql`DROP TYPE owner_enum`.execute(db);
  await sql`DROP TYPE user_role`.execute(db);
}
