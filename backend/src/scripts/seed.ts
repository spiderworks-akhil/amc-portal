import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { DB } from "../db/types.generated";

async function main() {
  const db = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "althaf",
        database: process.env.DB_NAME || "amc-portal",
      }),
    }),
  });

  await db
    .insertInto("service_providers")
    .values([
      { name: "AWS", type: "cloud" },
      { name: "DigitalOcean", type: "cloud" },
      { name: "Cloudflare", type: "cdn" },
      { name: "Namecheap", type: "registrar" },
      { name: "Google Domains", type: "registrar" },
      { name: "Laravel Forge", type: "cloud" },
      { name: "Hetzner", type: "cloud" },
    ])
    .execute();

  await db
    .insertInto("users")
    .values({
      name: "Admin",
      email: "admin@amc.local",
      password_hash: "$2b$10$placeholder",
      role: "user",
      is_active: true,
      remote_user_id: BigInt(1),
    })
    .execute();

  console.log("Seed complete: asset types, providers, and admin user created.");
  await db.destroy();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
