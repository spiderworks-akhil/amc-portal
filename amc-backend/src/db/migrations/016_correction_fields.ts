import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("clients")
    .addColumn("created_by", "uuid", (col) =>
      col.references("users.id").onDelete("set null")
    )
    .addColumn("updated_by", "uuid", (col) =>
      col.references("users.id").onDelete("set null")
    )
    .execute();

  await db.schema
    .alterTable("users")
    .addColumn("access_token", "varchar(255)")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("clients")
    .dropColumn("created_by")
    .dropColumn("updated_by")
    .execute();

  await db.schema
    .alterTable("users")
    .dropColumn("access_token")
    .execute();
}