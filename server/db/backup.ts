/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WAL-safe SQLite backup and restore helpers.
 *
 * `better-sqlite3`'s online backup API is used instead of copying the main
 * database file, because a plain copy of a live WAL database can miss committed
 * pages still present in `-wal`. Restores are intentionally CLI-only: they must
 * run while the application server is stopped.
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config, BACKUPS_DIR } from '../config.ts';

const BACKUP_PREFIX = 'mta_academic_backup_';
const SAFETY_PREFIX = 'mta_academic_prerestore_';

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  fileName?: string;
  error?: string;
}

/** Creates a consistent online backup of the configured SQLite database. */
export async function createDatabaseBackup(dbPath: string = config.dbPath): Promise<BackupResult> {
  if (!fs.existsSync(dbPath)) {
    return { success: false, error: 'Database file does not exist' };
  }
  ensureBackupsDir();
  const fileName = `${BACKUP_PREFIX}${timestamp()}.db`;
  const destination = path.join(BACKUPS_DIR, fileName);

  let source: Database.Database | undefined;
  try {
    source = new Database(dbPath, { readonly: true, fileMustExist: true });
    await source.backup(destination);
    const check = new Database(destination, { readonly: true });
    const integrity = check.pragma('integrity_check', { simple: true });
    check.close();
    if (integrity !== 'ok') {
      fs.unlinkSync(destination);
      return { success: false, error: `Backup failed integrity check: ${String(integrity)}` };
    }
    return { success: true, backupPath: destination, fileName };
  } catch (err) {
    if (fs.existsSync(destination)) fs.unlinkSync(destination);
    return { success: false, error: (err as Error).message };
  } finally {
    source?.close();
  }
}

export function listDatabaseBackups(): Array<{ fileName: string; sizeBytes: number; modifiedAt: string }> {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((file) => file.endsWith('.db'))
    .map((fileName) => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, fileName));
      return { fileName, sizeBytes: stat.size, modifiedAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

/**
 * Restores a backup. Must only be called with the server stopped (use the
 * `db:restore` script). A safety copy of the current database is made first.
 */
export function restoreDatabaseBackup(
  backupFileName: string,
  options: { dbPath?: string; allowRunningServer?: boolean } = {},
): { success: boolean; error?: string; safetyBackupPath?: string } {
  ensureBackupsDir();
  const safeName = path.basename(backupFileName);
  const source = path.join(BACKUPS_DIR, safeName);
  const target = options.dbPath || config.dbPath;

  if (!fs.existsSync(source)) {
    return { success: false, error: `Backup file ${safeName} was not found` };
  }

  let check: Database.Database | undefined;
  try {
    check = new Database(source, { readonly: true, fileMustExist: true });
    const integrity = check.pragma('integrity_check', { simple: true });
    const foreignKeys = check.pragma('foreign_key_check') as unknown[];
    if (integrity !== 'ok') {
      return { success: false, error: `Backup failed integrity check: ${String(integrity)}` };
    }
    if (foreignKeys.length > 0) {
      return { success: false, error: 'Backup contains foreign key violations' };
    }
  } finally {
    check?.close();
  }

  if (options.allowRunningServer !== true) {
    return {
      success: false,
      error:
        'Restore is blocked while the server may be running. Stop the server and use `bun run db:restore -- <file>`.',
    };
  }

  const safetyBackupPath = path.join(BACKUPS_DIR, `${SAFETY_PREFIX}${timestamp()}.db`);
  if (fs.existsSync(target)) {
    fs.copyFileSync(target, safetyBackupPath);
  }
  fs.copyFileSync(source, target);
  // Remove stale WAL/SHM files so SQLite does not replay an old transaction log.
  for (const suffix of ['-wal', '-shm']) {
    const sidecar = `${target}${suffix}`;
    if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
  }
  return { success: true, safetyBackupPath };
}
