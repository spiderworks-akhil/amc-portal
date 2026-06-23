import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add enum type
  await sql`
    CREATE TYPE user_role AS ENUM ('user', 'admin')
  `.execute(db);

  // Add is_active column
  await db.schema
    .alterTable("users")
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true))
    .execute();

  // Convert role column to enum
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

  // Set default value
  await sql`
    ALTER TABLE users
    ALTER COLUMN role SET DEFAULT 'user'
  `.execute(db);
  await db.schema
  .alterTable("contracts")
    .addColumn("label", "varchar(255)")
    .dropColumn("notes")
    .dropColumn('scopes')
    .execute();
     await db.schema
    .alterTable("assets")
    .dropColumn("primary_url")
    .execute();
}


export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .dropColumn("is_active")
    .execute();

  await sql`
    ALTER TABLE users
    ALTER COLUMN role TYPE text
  `.execute(db);

  await sql`
    DROP TYPE user_role
  `.execute(db);
  await db.schema
    .alterTable("assets")
    .addColumn("primary_url", "text")
    .execute();
}