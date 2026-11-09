/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Security-focused API tests: headers, CORS, rate limiting and authorization.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mta-security-'));
process.env.MTA_DATA_DIR = tempDir;
process.env.MTA_UPLOADS_DIR = path.join(tempDir, 'uploads');
process.env.MTA_DB_PATH = path.join(tempDir, 'test.db');
process.env.MTA_INITIAL_ADMIN_PASSWORD = 'AdminTestPass123';
process.env.MTA_DISABLE_VITE = '1';
process.env.NODE_ENV = 'development';
process.env.LOGIN_RATE_LIMIT_PER_15_MIN = '3';
process.env.UPLOAD_RATE_LIMIT_PER_HOUR = '2';
process.env.REPORT_RATE_LIMIT_PER_HOUR = '2';

let server: Server;
let baseUrl = '';

test('security controls', async (t) => {
  const { createApp } = await import('../app.ts');
  const { sqlite } = await import('../db/index.ts');
  const { resetRateLimits } = await import('../middleware.ts');
  const app = await createApp({ disableVite: true });
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  baseUrl = `http://127.0.0.1:${address.port}`;

  await t.test('security headers and no-store API caching are present', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  await t.test('unknown browser origins are rejected', async () => {
    const res = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(res.status, 403);
    const preflight = await fetch(`${baseUrl}/api/academic/institutions`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example' },
    });
    assert.equal(preflight.status, 403);
  });

  await t.test('allowed same-origin development origin receives CORS approval', async () => {
    const res = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  });

  await t.test('login attempts are rate limited', async () => {
    const attempt = () =>
      fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@example.test', password: 'WrongPass123' }),
      });
    assert.equal((await attempt()).status, 401);
    assert.equal((await attempt()).status, 401);
    assert.equal((await attempt()).status, 401);
    const limited = await attempt();
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  });

  await t.test('upload attempts are rate limited even when malformed', async () => {
    const attempt = () =>
      fetch(`${baseUrl}/api/documents/upload`, {
        method: 'POST',
        body: new FormData(),
      });
    assert.equal((await attempt()).status, 400);
    assert.equal((await attempt()).status, 400);
    assert.equal((await attempt()).status, 429);
  });

  await t.test('invalid identifiers are rejected without SQL or path leakage', async () => {
    const res = await fetch(`${baseUrl}/api/academic/institutions/not-a-number`);
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.error, 'Invalid ID');

    const download = await fetch(`${baseUrl}/api/documents/0/download`);
    assert.equal(download.status, 400);
  });

  await t.test('account deletion is blocked for the last super administrator', async () => {
    // Earlier subtests deliberately exhausted the login limiter for this IP.
    resetRateLimits();
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mta-tech.ye', password: 'AdminTestPass123' }),
    });
    assert.equal(login.status, 200);
    const token = ((await login.json()) as any).token;
    const res = await fetch(`${baseUrl}/api/auth/delete-account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 403);
  });

  sqlite.close();
});

test.after(() => {
  server?.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
