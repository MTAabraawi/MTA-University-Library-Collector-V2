/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Backup and restore tests on isolated temporary databases.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mta-backup-'));
process.env.MTA_DATA_DIR = tempDir;

test('SQLite backup and restore preserve records and integrity', async () => {
  const { createDatabaseBackup, listDatabaseBackups, restoreDatabaseBackup } = await import('../db/backup.ts');

  const sourcePath = path.join(tempDir, 'source.db');
  const source = new Database(sourcePath);
  source.pragma('journal_mode = WAL');
  source.exec('CREATE TABLE records (id INTEGER PRIMARY KEY, title TEXT NOT NULL)');
  source.prepare('INSERT INTO records (title) VALUES (?)').run('Preserved academic record');
  source.close();

  const backup = await createDatabaseBackup(sourcePath);
  assert.equal(backup.success, true, backup.error);
  assert.ok(backup.backupPath && fs.existsSync(backup.backupPath));
  assert.ok(listDatabaseBackups().some((item) => item.fileName === backup.fileName));

  const backupDb = new Database(backup.backupPath!, { readonly: true });
  assert.equal(backupDb.pragma('integrity_check', { simple: true }), 'ok');
  assert.equal((backupDb.prepare('SELECT COUNT(*) AS c FROM records').get() as { c: number }).c, 1);
  backupDb.close();

  const blocked = restoreDatabaseBackup(backup.fileName!, { dbPath: sourcePath });
  assert.equal(blocked.success, false);
  assert.match(blocked.error || '', /Stop the server/);

  const restoreTarget = path.join(tempDir, 'restored.db');
  fs.copyFileSync(backup.backupPath!, restoreTarget);
  const restored = restoreDatabaseBackup(backup.fileName!, {
    dbPath: restoreTarget,
    allowRunningServer: true,
  });
  assert.equal(restored.success, true, restored.error);

  const restoredDb = new Database(restoreTarget, { readonly: true });
  assert.equal(restoredDb.pragma('integrity_check', { simple: true }), 'ok');
  const row = restoredDb.prepare('SELECT title FROM records LIMIT 1').get() as { title: string };
  assert.equal(row.title, 'Preserved academic record');
  restoredDb.close();
});

test.after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});
