import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // TODO: write your migration
  await db.schema
    .alterTable("client_account_managers")
    .addColumn("created_by", "uuid", (col) => col.references('users.id'))
    .addColumn("updated_by", "uuid", (col) => col.references('users.id'))
    .execute();
  await db.schema
    .alterTable("client_contacts")
    .addColumn("created_by", "uuid", (col) => col.references('users.id'))
    .addColumn("updated_by", "uuid", (col) => col.references('users.id'))
    .execute();
}
