import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import * as path from "path";
import { promises as fs } from "fs";
import { createRequire } from "module";

const req = createRequire(__filename);
const { Migrator } = req("kysely/migration");

class ScriptFileProvider {
  constructor(private folder: string) {}

  async getMigrations(): Promise<Record<string, { up: (db: Kysely<unknown>) => Promise<void> }>> {
    const migrations: Record<string, { up: (db: Kysely<unknown>) => Promise<void> }> = {};
    const files = await fs.readdir(this.folder);
    const tsFiles = files
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
      .sort();

    for (const file of tsFiles) {
      const filePath = path.join(this.folder, file);
      const mod = req(filePath);
      const migration = mod.default ?? mod;
      const key = file.replace(/\.ts$/, "");
      migrations[key] = migration;
    }

    return migrations;
  }
}

async function main() {
  const db = new Kysely<unknown>({
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

  const migrator = new Migrator({
    db,
    provider: new ScriptFileProvider(
      path.join(__dirname, "..", "db", "migrations")
    ),
  });

  const command = process.argv[2] || "latest";

  if (command === "down") {
    const { error, results } = await migrator.migrateDown();
    for (const r of results ?? []) {
      console.log(`Rolled back: ${r.migrationName} — ${r.status}`);
    }
    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }
  } else {
    const { error, results } = await migrator.migrateToLatest();
    for (const r of results ?? []) {
      console.log(`${r.migrationName} — ${r.status}`);
    }
    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }
  }

  await db.destroy();
}

main();
