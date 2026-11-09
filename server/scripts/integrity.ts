/**
 * CLI: bun run db:integrity
 * Verifies SQLite integrity and foreign-key constraints, and prints row counts.
 */
import { sqlite } from '../db/index.ts';

const integrity = sqlite.pragma('integrity_check', { simple: true });
const foreignKeys = sqlite.pragma('foreign_key_check') as unknown[];
const tables = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all() as Array<{ name: string }>;

console.log(`integrity_check: ${String(integrity)}`);
console.log(`foreign_key_check: ${foreignKeys.length === 0 ? 'clean' : JSON.stringify(foreignKeys)}`);
for (const table of tables) {
  const count = (sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table.name}`).get() as { c: number }).c;
  console.log(`  ${table.name}: ${count}`);
}
if (integrity !== 'ok' || foreignKeys.length > 0) process.exit(1);
