/**
 * CLI: bun run db:backup
 * Creates a consistent, integrity-checked SQLite backup without stopping the app.
 */
import { createDatabaseBackup, listDatabaseBackups } from '../db/backup.ts';

const result = await createDatabaseBackup();
if (!result.success) {
  console.error(`[backup] Failed: ${result.error}`);
  process.exit(1);
}
console.log(`[backup] Created ${result.backupPath}`);
console.log(`[backup] Available backups: ${listDatabaseBackups().length}`);
