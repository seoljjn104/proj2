// Parses every SQL file under supabase/ with libpg_query to catch
// syntax errors before they reach a database.
// Usage: npm run db:parse
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "pgsql-parser";

const { parse } = pkg;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dirs = [
  path.join(root, "supabase", "migrations"),
  path.join(root, "supabase"),
];

const files = [];
for (const dir of dirs) {
  let entries = [];
  try {
    entries = await readdir(dir);
  } catch {
    continue;
  }
  for (const entry of entries) {
    if (entry.endsWith(".sql")) files.push(path.join(dir, entry));
  }
}

files.sort();

let failed = 0;
for (const file of files) {
  const sql = await readFile(file, "utf8");
  const label = path.relative(root, file);
  try {
    await parse(sql);
    console.log(`OK    ${label}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL  ${label}`);
    console.error(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} file(s) failed to parse.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} SQL files parsed cleanly.`);
