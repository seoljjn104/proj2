import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env.local");

/** Reads a single value from the gitignored .env.local (repo root). */
export function envLocal(name: string): string | undefined {
  try {
    const text = readFileSync(ENV_PATH, "utf8");
    const m = text.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") || undefined : undefined;
  } catch {
    return undefined;
  }
}

/** Test-harness password, from the environment or .env.local. Never committed. */
export function e2ePassword(): string {
  return process.env.E2E_PASSWORD ?? envLocal("E2E_PASSWORD") ?? "";
}

/** Accounts created/managed by scripts/e2e.mjs. */
export const ACCOUNTS = {
  admin: "alice@skillgrid.test",
  member: "bob@skillgrid.test",
} as const;
