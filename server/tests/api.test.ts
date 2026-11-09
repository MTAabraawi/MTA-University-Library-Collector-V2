/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * End-to-end API tests against a real Express server and an isolated temporary
 * SQLite database. No production data is used or modified.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mta-api-'));
process.env.MTA_DATA_DIR = tempDir;
process.env.MTA_UPLOADS_DIR = path.join(tempDir, 'uploads');
process.env.MTA_DB_PATH = path.join(tempDir, 'test.db');
process.env.MTA_INITIAL_ADMIN_PASSWORD = 'AdminTestPass123';
process.env.MTA_DISABLE_VITE = '1';
process.env.NODE_ENV = 'development';

const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'latin1',
);

let server: Server;
let baseUrl = '';
let adminToken = '';
let userToken = '';
let sqlite: import('better-sqlite3').Database;
let publishedDocumentId = 0;

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function uploadForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.append('document', new Blob([MINIMAL_PDF], { type: 'application/pdf' }), 'academic-notes.pdf');
  const fields: Record<string, string> = {
    title: 'Verified Academic Notes for Testing',
    description: 'A small structural PDF used by the automated API test suite.',
    categoryCode: 'lecture_notes',
    language: 'en',
    copyrightDeclarationAccepted: 'true',
    submitterName: 'API Test Visitor',
    submitterEmail: 'visitor@example.test',
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}

test('MTA API integration', async (t) => {
  const { createApp } = await import('../app.ts');
  const dbModule = await import('../db/index.ts');
  sqlite = dbModule.sqlite;

  const app = await createApp({ disableVite: true });
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  baseUrl = `http://127.0.0.1:${address.port}`;

  await t.test('health reports a connected database', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.status, 'healthy');
    assert.equal(body.database, 'connected');
    assert.equal(body.developer, 'MTA TECHNOLOGIES');
  });

  await t.test('seeded directory data is served from SQLite', async () => {
    const res = await fetch(`${baseUrl}/api/academic/institutions`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.ok(body.institutions.length >= 5);
    assert.ok(body.institutions.some((u: any) => u.nameEn === "Sana'a University"));

    const courses = await fetch(`${baseUrl}/api/academic/courses?q=CS101`);
    const courseBody = (await courses.json()) as any;
    assert.equal(courseBody.courses.length, 1);
    assert.equal(courseBody.courses[0].code, 'CS101');
  });

  await t.test('global search returns database-backed results', async () => {
    const res = await fetch(`${baseUrl}/api/academic/search?q=CS101`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.ok(body.results.some((r: any) => r.type === 'course'));
  });

  await t.test('administrator can sign in and receive a hashed-session token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mta-tech.ye', password: 'AdminTestPass123' }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.user.role, 'super_admin');
    assert.ok(body.token.length > 20);
    adminToken = body.token;

    const stored = sqlite
      .prepare('SELECT token FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(body.user.id) as { token: string };
    assert.notEqual(stored.token, body.token, 'raw bearer token must not be stored in the database');
  });

  await t.test('public registration creates a regular user session', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.test',
        password: 'StudentPass123',
        fullName: 'Test Student',
      }),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    assert.equal(body.user.role, 'regular_user');
    userToken = body.token;
  });

  await t.test('weak passwords are rejected', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'weak@example.test', password: 'short', fullName: 'Weak User' }),
    });
    assert.equal(res.status, 400);
  });

  await t.test('server-side RBAC blocks regular users from moderation routes', async () => {
    const denied = await fetch(`${baseUrl}/api/documents/admin/review-queue`, {
      headers: auth(userToken),
    });
    assert.equal(denied.status, 403);

    const anonymous = await fetch(`${baseUrl}/api/documents/admin/review-queue`);
    assert.equal(anonymous.status, 401);

    const allowed = await fetch(`${baseUrl}/api/documents/admin/review-queue`, {
      headers: auth(adminToken),
    });
    assert.equal(allowed.status, 200);
  });

  await t.test('saved items are scoped to the authenticated user', async () => {
    const create = await fetch(`${baseUrl}/api/academic/saved-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(userToken) },
      body: JSON.stringify({ itemType: 'course', itemId: 1 }),
    });
    assert.equal(create.status, 201);
    const created = (await create.json()) as any;

    const list = await fetch(`${baseUrl}/api/academic/saved-items`, { headers: auth(userToken) });
    const listBody = (await list.json()) as any;
    assert.equal(listBody.items.length, 1);

    const removed = await fetch(`${baseUrl}/api/academic/saved-items/${created.item.id}`, {
      method: 'DELETE',
      headers: auth(userToken),
    });
    assert.equal(removed.status, 200);
  });

  await t.test('public PDF submission is quarantined and pending review', async () => {
    const res = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST',
      body: uploadForm(),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    assert.equal(body.status, 'pending_academic_review');

    const row = sqlite.prepare('SELECT status, storage_path FROM uploaded_documents WHERE id = ?').get(body.documentId) as any;
    assert.equal(row.status, 'pending_academic_review');
    assert.ok(row.storage_path.includes('quarantine'));
  });

  await t.test('duplicate PDF content is rejected by SHA-256', async () => {
    const res = await fetch(`${baseUrl}/api/documents/upload`, { method: 'POST', body: uploadForm() });
    assert.equal(res.status, 409);
  });

  await t.test('active-content PDFs are rejected by security screening', async () => {
    const unsafe = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R/OpenAction 4 0 R>>endobj\n4 0 obj<</S/JavaScript/JS(app.alert(1))>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
      'latin1',
    );
    const form = new FormData();
    form.append('document', new Blob([unsafe], { type: 'application/pdf' }), 'active.pdf');
    const fields: Record<string, string> = {
      title: 'Active Content PDF',
      categoryCode: 'lecture_notes',
      language: 'en',
      copyrightDeclarationAccepted: 'true',
      submitterName: 'Security Test',
      submitterEmail: 'security@example.test',
    };
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    const res = await fetch(`${baseUrl}/api/documents/upload`, { method: 'POST', body: form });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.match(body.error, /Security screening failed/);
  });

  await t.test('copyright declaration is mandatory', async () => {
    const unique = Buffer.from(`${MINIMAL_PDF.toString('latin1')}% unique-${Date.now()}\n`, 'latin1');
    const form = new FormData();
    form.append('document', new Blob([unique], { type: 'application/pdf' }), 'no-copyright.pdf');
    form.append('title', 'No Copyright Declaration');
    form.append('categoryCode', 'lecture_notes');
    form.append('language', 'en');
    form.append('submitterName', 'No Copyright');
    form.append('submitterEmail', 'nocopyright@example.test');
    const res = await fetch(`${baseUrl}/api/documents/upload`, { method: 'POST', body: form });
    assert.equal(res.status, 400);
  });

  await t.test('moderation approves, then publishes, and only then allows downloads', async () => {
    const list = await fetch(`${baseUrl}/api/documents/admin/review-queue`, { headers: auth(adminToken) });
    const queue = (await list.json()) as any;
    const doc = queue.documents.find((d: any) => d.title === 'Verified Academic Notes for Testing');
    assert.ok(doc, 'uploaded document must be in the moderation queue');

    const approved = await fetch(`${baseUrl}/api/documents/admin/${doc.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({ action: 'approve', notes: 'Metadata and license verified' }),
    });
    assert.equal(approved.status, 200);
    assert.equal(((await approved.json()) as any).status, 'approved');

    const downloadBeforePublish = await fetch(`${baseUrl}/api/documents/${doc.id}/download`);
    assert.equal(downloadBeforePublish.status, 403);

    const published = await fetch(`${baseUrl}/api/documents/admin/${doc.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({ action: 'publish' }),
    });
    assert.equal(published.status, 200);
    assert.equal(((await published.json()) as any).status, 'published');
    publishedDocumentId = doc.id;

    const publicList = await fetch(`${baseUrl}/api/documents/published`);
    const publicBody = (await publicList.json()) as any;
    assert.ok(publicBody.documents.some((d: any) => d.id === doc.id));

    const download = await fetch(`${baseUrl}/api/documents/${doc.id}/download`);
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('content-type'), 'application/pdf');
    const bytes = Buffer.from(await download.arrayBuffer());
    assert.ok(bytes.toString('latin1').startsWith('%PDF-'));
  });

  await t.test('public complaint workflow records a report', async () => {
    const report = await fetch(`${baseUrl}/api/documents/${publishedDocumentId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporterName: 'Rights Holder',
        reporterEmail: 'rights@example.test',
        reason: 'copyright_infringement',
        details: 'This is an automated test complaint with sufficient detail.',
      }),
    });
    assert.equal(report.status, 201);

    const reports = await fetch(`${baseUrl}/api/documents/admin/reports`, { headers: auth(adminToken) });
    const body = (await reports.json()) as any;
    assert.ok(body.reports.length >= 1);
  });

  await t.test('unpublishing immediately blocks downloads', async () => {
    const res = await fetch(`${baseUrl}/api/documents/admin/${publishedDocumentId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({ action: 'unpublish', notes: 'Complaint under investigation' }),
    });
    assert.equal(res.status, 200);
    const download = await fetch(`${baseUrl}/api/documents/${publishedDocumentId}/download`);
    assert.equal(download.status, 403);
  });

  await t.test('admin CRUD validates and persists academic content', async () => {
    const created = await fetch(`${baseUrl}/api/admin/content/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({
        code: 'TST101',
        titleAr: 'مقرر اختبار',
        titleEn: 'Test Course',
        disciplineAr: 'اختبار',
        disciplineEn: 'Testing',
        credits: 3,
        sourceUrl: 'https://example.edu/catalog',
        sourceInstitution: 'Test University',
        verificationStatus: 'verified',
      }),
    });
    assert.equal(created.status, 201);
    const record = ((await created.json()) as any).record;
    assert.equal(record.code, 'TST101');

    const patched = await fetch(`${baseUrl}/api/admin/content/courses/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({ credits: 4 }),
    });
    assert.equal(patched.status, 200);
    assert.equal(((await patched.json()) as any).record.credits, 4);

    const duplicate = await fetch(`${baseUrl}/api/admin/content/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({
        code: 'TST101',
        titleAr: 'مكرر',
        titleEn: 'Duplicate',
        disciplineAr: 'اختبار',
        disciplineEn: 'Testing',
      }),
    });
    assert.equal(duplicate.status, 409);

    const removed = await fetch(`${baseUrl}/api/admin/content/courses/${record.id}`, {
      method: 'DELETE',
      headers: auth(adminToken),
    });
    assert.equal(removed.status, 200);
  });

  await t.test('bulk content import reports per-record outcomes', async () => {
    const res = await fetch(`${baseUrl}/api/admin/content/courses/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({
        records: [
          {
            code: 'BLK101',
            titleAr: 'دفعة ١',
            titleEn: 'Bulk One',
            disciplineAr: 'اختبار',
            disciplineEn: 'Testing',
          },
          { code: 'BLK102', titleEn: 'Missing Arabic title' },
        ],
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.succeeded, 1);
    assert.equal(body.results[1].success, false);
  });

  await t.test('institution verification records provenance and audit trail', async () => {
    const res = await fetch(`${baseUrl}/api/admin/universities/1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({
        verificationStatus: 'verified',
        sourceUrl: 'https://su.edu.ye/verification',
        sourceInstitution: 'Sana\'a University',
        supportingDocumentationUrl: 'https://su.edu.ye/verification/document.pdf',
        notes: 'Automated test verification',
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.record.general_verification_status, 'verified_complete');
    assert.equal(body.record.last_verified_at !== null, true);

    const logs = await fetch(`${baseUrl}/api/admin/audit-logs`, { headers: auth(adminToken) });
    const logBody = (await logs.json()) as any;
    assert.ok(logBody.logs.some((l: any) => l.action === 'INSTITUTION_VERIFICATION_UPDATED'));
  });

  await t.test('database backup can be created and listed', async () => {
    const created = await fetch(`${baseUrl}/api/admin/backups`, {
      method: 'POST',
      headers: auth(adminToken),
    });
    assert.equal(created.status, 201);
    const list = await fetch(`${baseUrl}/api/admin/backups`, { headers: auth(adminToken) });
    const body = (await list.json()) as any;
    assert.ok(body.backups.length >= 1);
  });

  await t.test('integrity endpoint reports a clean database', async () => {
    const res = await fetch(`${baseUrl}/api/admin/integrity`, { headers: auth(adminToken) });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.integrity, 'ok');
    assert.deepEqual(body.foreignKeyViolations, []);
  });
});

test.after(() => {
  server?.close();
  try {
    sqlite?.close();
  } catch {
    // already closed
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});
