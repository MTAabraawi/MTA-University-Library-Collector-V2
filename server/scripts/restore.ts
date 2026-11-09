/**
 * CLI: bun run db:restore -- <backup-file-name>
 * Restores a backup with the server stopped. A safety copy is created first.
 */
import { restoreDatabaseBackup, listDatabaseBackups } from '../db/backup.ts';

const requested = process.argv[2];
if (!requested) {
  console.error('Usage: bun run db:restore -- <backup-file-name>');
  console.error('Available backups:');
  for (const backup of listDatabaseBackups()) console.error(` - ${backup.fileName}`);
  process.exit(1);
}

const result = restoreDatabaseBackup(requested, { allowRunningServer: true });
if (!result.success) {
  console.error(`[restore] Failed: ${result.error}`);
  process.exit(1);
}
console.log(`[restore] Restored ${requested}`);
if (result.safetyBackupPath) console.log(`[restore] Safety copy of previous database: ${result.safetyBackupPath}`);
console.log('[restore] Start the server again to load the restored database.');
