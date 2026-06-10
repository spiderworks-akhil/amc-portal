import * as path from "path";
import { promises as fs } from "fs";

const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

const TEMPLATE = `import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // TODO: write your migration
}
`;

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error("Usage: npm run migrate:create -- <migration_name>");
    process.exit(1);
  }

  const files = await fs.readdir(MIGRATIONS_DIR);
  const tsFiles = files
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
    .sort();

  const lastNum =
    tsFiles.length > 0
      ? Math.max(...tsFiles.map((f) => parseInt(f.split("_")[0], 10)))
      : 0;

  const nextNum = String(lastNum + 1).padStart(3, "0");
  const filename = `${nextNum}_${name}.ts`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  await fs.writeFile(filepath, TEMPLATE, "utf-8");
  console.log(`Created: ${filename}`);
}

main();
