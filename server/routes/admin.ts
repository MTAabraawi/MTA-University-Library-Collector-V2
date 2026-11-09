/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Administration API: user/role management, academic directory CRUD, bulk
 * imports, provenance verification, audit logs and safe database backups.
 * All statements use bound parameters and an explicit column allow-list.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sqlite, db } from '../db/index.ts';
import { authenticate, requireRole, type AuthenticatedUser, ROLES } from './auth.ts';
import { createDatabaseBackup, listDatabaseBackups } from '../db/backup.ts';
import {
  universities,
  faculties,
  departments,
  academicPrograms,
  courses,
  libraryReferences,
  uploadedDocuments,
  users,
  sources,
  verificationAuditLogs,
} from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';

export const adminRouter = Router();

const requireAdmin = requireRole('super_admin', 'admin');
const requireContentEditor = requireRole('super_admin', 'admin', 'academic_editor');
const requireSuperAdmin = requireRole('super_admin');

function audit(
  req: Request,
  action: string,
  entityType: string,
  entityId: number,
  before: unknown,
  after: unknown,
) {
  const user = (req as any).user as AuthenticatedUser | null;
  db.insert(verificationAuditLogs)
    .values({
      userId: user?.id ?? null,
      action,
      entityType,
      entityId,
      beforeState: before ? JSON.stringify(before) : null,
      afterState: after ? JSON.stringify(after) : null,
      ipAddress: req.ip || null,
    })
    .run();
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

interface EntityConfig {
  table: string;
  required: string[];
  columns: string[];
  numeric?: string[];
  booleans?: string[];
  json?: string[];
}

const COMMON_PROVENANCE = [
  'sourceUrl',
  'sourceInstitution',
  'collectedAt',
  'verificationStatus',
  'lastVerifiedAt',
  'supportingDocumentationUrl',
  'verificationNotes',
];

const ENTITIES: Record<string, EntityConfig> = {
  universities: {
    table: 'universities',
    required: ['nameAr', 'nameEn'],
    numeric: ['countryId', 'establishedYear', 'facultiesCount', 'programsCount'],
    booleans: ['isDemoRecord'],
    columns: [
      'countryId', 'nameAr', 'nameEn', 'nameShort', 'sector', 'governorateId', 'governorateAr',
      'governorateEn', 'establishedYear', 'websiteUrl', 'email', 'phone', 'address', 'logoUrl',
      'licensingStatus', 'licensingAuthorityAr', 'licensingAuthorityEn', 'licensingDecreeNumber',
      'licensingDecreeDate', 'accreditationStatus', 'accreditationAuthorityAr',
      'accreditationAuthorityEn', 'accreditationCertificateNumber', 'accreditationDate',
      'generalVerificationStatus', 'lastVerifiedAt', 'verificationNotes', 'sourceUrl',
      'isDemoRecord', 'facultiesCount', 'programsCount', 'collectedAt', 'supportingDocumentationUrl',
    ],
  },
  faculties: {
    table: 'faculties',
    required: ['universityId', 'nameAr', 'nameEn'],
    numeric: ['universityId', 'campusId', 'establishedYear'],
    columns: ['universityId', 'campusId', 'nameAr', 'nameEn', 'deanName', 'establishedYear', ...COMMON_PROVENANCE],
  },
  departments: {
    table: 'departments',
    required: ['facultyId', 'nameAr', 'nameEn'],
    numeric: ['facultyId'],
    columns: ['facultyId', 'nameAr', 'nameEn', 'headOfDepartment', ...COMMON_PROVENANCE],
  },
  programs: {
    table: 'academic_programs',
    required: ['departmentId', 'facultyId', 'universityId', 'nameAr', 'nameEn'],
    numeric: ['departmentId', 'facultyId', 'universityId', 'durationYears', 'totalCredits'],
    booleans: ['isDemoRecord'],
    columns: [
      'departmentId', 'facultyId', 'universityId', 'nameAr', 'nameEn', 'degreeLevel', 'studyType',
      'durationYears', 'totalCredits', 'programmaticAccreditation', 'programmaticAuthorityAr',
      'programmaticAuthorityEn', 'isDemoRecord', ...COMMON_PROVENANCE,
    ],
  },
  'study-plans': {
    table: 'study_plans',
    required: ['programId', 'versionYear', 'versionNameAr', 'versionNameEn', 'totalCredits', 'totalSemesters'],
    numeric: ['programId', 'totalCredits', 'totalSemesters'],
    booleans: ['isActive', 'isDemoRecord'],
    columns: [
      'programId', 'versionYear', 'versionNameAr', 'versionNameEn', 'isActive', 'totalCredits',
      'totalSemesters', 'approvedDate', 'approvalDecree', 'isDemoRecord', ...COMMON_PROVENANCE,
    ],
  },
  courses: {
    table: 'courses',
    required: ['code', 'titleAr', 'titleEn', 'disciplineAr', 'disciplineEn'],
    numeric: ['credits', 'lectureHours', 'labHours', 'tutorialHours'],
    booleans: ['isElective', 'isSharedCore'],
    json: ['objectivesAr', 'objectivesEn', 'topicsAr', 'topicsEn'],
    columns: [
      'code', 'titleAr', 'titleEn', 'disciplineAr', 'disciplineEn', 'credits', 'lectureHours',
      'labHours', 'tutorialHours', 'descriptionAr', 'descriptionEn', 'objectivesAr', 'objectivesEn',
      'topicsAr', 'topicsEn', 'isElective', 'isSharedCore', ...COMMON_PROVENANCE,
    ],
  },
  library: {
    table: 'library_references',
    required: ['titleAr', 'titleEn', 'authors', 'publicationYear', 'publisher', 'discipline', 'originalUrl'],
    numeric: ['publicationYear', 'relatedUniversityId', 'relatedDepartmentId', 'relatedProgramId', 'relatedCourseId'],
    booleans: ['isVerified', 'isDemoRecord', 'downloadAllowed'],
    columns: [
      'titleAr', 'titleEn', 'authors', 'publicationYear', 'publisher', 'discipline', 'resourceType',
      'doi', 'isbn', 'license', 'accessType', 'originalUrl', 'localFileUrl', 'abstractAr',
      'abstractEn', 'isVerified', 'isDemoRecord', 'language', 'subject', 'copyrightInfo',
      'availability', 'downloadAllowed', 'relatedUniversityId', 'relatedDepartmentId',
      'relatedProgramId', 'relatedCourseId', ...COMMON_PROVENANCE,
    ],
  },
  sources: {
    table: 'sources',
    required: ['authorityAr', 'authorityEn', 'titleAr', 'titleEn', 'typeAr', 'typeEn', 'documentUrl'],
    columns: [
      'authorityAr', 'authorityEn', 'titleAr', 'titleEn', 'typeAr', 'typeEn', 'decreeNumber',
      'issueDate', 'documentUrl', 'verificationStatus', 'notes',
    ],
  },
};

function normalizeValue(config: EntityConfig, key: string, value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (config.booleans?.includes(key)) return value === true || value === 'true' || value === 1 ? 1 : 0;
  if (config.numeric?.includes(key)) {
    if (value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (config.json?.includes(key)) {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  return value;
}

function sanitizeRecord(config: EntityConfig, body: Record<string, unknown>, requireFields: boolean) {
  const values: Record<string, unknown> = {};
  for (const key of config.columns) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      values[key] = normalizeValue(config, key, body[key]);
    }
  }
  if (requireFields) {
    for (const key of config.required) {
      if (
        !Object.prototype.hasOwnProperty.call(values, key) ||
        values[key] === null ||
        values[key] === ''
      ) {
        return { error: `Missing required field: ${key}` };
      }
    }
  }
  return { values };
}

function getEntity(name: string): EntityConfig | null {
  return ENTITIES[name] || null;
}

function tableRows(table: string, limit = 500): Array<Record<string, unknown>> {
  return sqlite.prepare(`SELECT * FROM ${table} ORDER BY id DESC LIMIT ?`).all(limit) as Array<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Overview, integrity and audit
// ---------------------------------------------------------------------------

adminRouter.get('/overview', authenticate, requireContentEditor, (_req: Request, res: Response) => {
  const count = (table: string) =>
    (sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
  return res.json({
    overview: {
      institutions: count('universities'),
      faculties: count('faculties'),
      departments: count('departments'),
      programs: count('academic_programs'),
      studyPlans: count('study_plans'),
      courses: count('courses'),
      libraryReferences: count('library_references'),
      officialSources: count('sources'),
      documents: count('uploaded_documents'),
      pendingDocuments: (
        sqlite
          .prepare(
            "SELECT COUNT(*) AS c FROM uploaded_documents WHERE status IN ('submitted','screening','pending_review','pending_academic_review')",
          )
          .get() as { c: number }
      ).c,
      openReports: (sqlite.prepare("SELECT COUNT(*) AS c FROM document_reports WHERE status = 'open'").get() as { c: number }).c,
      users: count('users'),
      backups: listDatabaseBackups().length,
      databaseEngine: 'SQLite (WAL, foreign keys on)',
      postgresStatus: 'schema and SQL migrations included; not connected in this runtime',
    },
  });
});

adminRouter.get('/integrity', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const integrity = sqlite.pragma('integrity_check', { simple: true });
  const foreignKeys = sqlite.pragma('foreign_key_check');
  return res.json({
    integrity,
    foreignKeyViolations: foreignKeys,
    journalMode: sqlite.pragma('journal_mode', { simple: true }),
    database: 'mta_academic.db',
  });
});

adminRouter.get('/audit-logs', authenticate, requireAdmin, (req: Request, res: Response) => {
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(req.query.limit || '100'), 10) || 100));
  const logs = sqlite
    .prepare(
      `SELECT l.*, u.email AS actor_email
       FROM verification_audit_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.id DESC LIMIT ?`,
    )
    .all(limit);
  return res.json({ logs });
});

// ---------------------------------------------------------------------------
// Users and roles
// ---------------------------------------------------------------------------

adminRouter.get('/users', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const rows = sqlite
    .prepare(
      `SELECT id, email, full_name, role, institution_id, is_active, last_login_at, created_at, updated_at
       FROM users ORDER BY id ASC`,
    )
    .all();
  return res.json({ users: rows });
});

adminRouter.patch('/users/:id/role', authenticate, requireSuperAdmin, (req: Request, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid user ID' });
  const parsed = z.object({ role: z.enum(ROLES as [string, ...string[]]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid role' });

  const target = sqlite.prepare('SELECT id, email, role FROM users WHERE id = ?').get(id) as
    | { id: number; email: string; role: string }
    | undefined;
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'super_admin' && parsed.data.role !== 'super_admin') {
    const superAdmins = sqlite
      .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'super_admin' AND is_active = 1")
      .get() as { c: number };
    if (superAdmins.c <= 1) return res.status(409).json({ error: 'At least one active super administrator is required' });
  }

  const actor = (req as any).user as AuthenticatedUser;
  if (actor.id === id && parsed.data.role !== 'super_admin') {
    return res.status(409).json({ error: 'You cannot remove your own super administrator role' });
  }

  sqlite
    .prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(parsed.data.role, id);
  audit(req, 'USER_ROLE_UPDATED', 'user', id, { role: target.role }, { role: parsed.data.role });
  return res.json({ success: true, role: parsed.data.role });
});

adminRouter.patch('/users/:id/status', authenticate, requireAdmin, (req: Request, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid user ID' });
  const parsed = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'isActive must be boolean' });

  const target = sqlite.prepare('SELECT id, role, is_active FROM users WHERE id = ?').get(id) as
    | { id: number; role: string; is_active: number }
    | undefined;
  if (!target) return res.status(404).json({ error: 'User not found' });

  const actor = (req as any).user as AuthenticatedUser;
  if (actor.id === id && !parsed.data.isActive) {
    return res.status(409).json({ error: 'You cannot deactivate your own account' });
  }
  if (target.role === 'super_admin' && !parsed.data.isActive && actor.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only a super administrator can deactivate a super administrator' });
  }

  sqlite
    .prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(parsed.data.isActive ? 1 : 0, id);
  audit(req, 'USER_STATUS_UPDATED', 'user', id, { isActive: Boolean(target.is_active) }, { isActive: parsed.data.isActive });
  return res.json({ success: true, isActive: parsed.data.isActive });
});

// ---------------------------------------------------------------------------
// Academic content CRUD (universities, faculties, departments, programs,
// study plans, courses, library references, official sources)
// ---------------------------------------------------------------------------

adminRouter.get('/content/:entity', authenticate, requireContentEditor, (req: Request, res: Response) => {
  const entity = getEntity(req.params.entity);
  if (!entity) return res.status(404).json({ error: 'Unknown content type' });
  return res.json({ entity: req.params.entity, records: tableRows(entity.table) });
});

adminRouter.post('/content/:entity', authenticate, requireContentEditor, (req: Request, res: Response) => {
  const entity = getEntity(req.params.entity);
  if (!entity) return res.status(404).json({ error: 'Unknown content type' });

  const sanitized = sanitizeRecord(entity, req.body || {}, true);
  if (sanitized.error) return res.status(400).json({ error: sanitized.error });
  const values = sanitized.values!;
  const keys = Object.keys(values);
  if (keys.length === 0) return res.status(400).json({ error: 'No valid fields supplied' });

  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${entity.table} (${keys.map(camelToSnake).join(', ')}) VALUES (${placeholders})`;
  try {
    const result = sqlite.prepare(sql).run(...keys.map((key) => values[key] as any));
    const created = sqlite.prepare(`SELECT * FROM ${entity.table} WHERE id = ?`).get(result.lastInsertRowid);
    audit(req, 'CONTENT_CREATED', req.params.entity, Number(result.lastInsertRowid), null, created);
    return res.status(201).json({ success: true, record: created });
  } catch (err) {
    return constraintAwareError(res, err);
  }
});

adminRouter.patch('/content/:entity/:id', authenticate, requireContentEditor, (req: Request, res: Response) => {
  const entity = getEntity(req.params.entity);
  if (!entity) return res.status(404).json({ error: 'Unknown content type' });
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid record ID' });

  const before = sqlite.prepare(`SELECT * FROM ${entity.table} WHERE id = ?`).get(id);
  if (!before) return res.status(404).json({ error: 'Record not found' });

  const sanitized = sanitizeRecord(entity, req.body || {}, false);
  if (sanitized.error) return res.status(400).json({ error: sanitized.error });
  const values = sanitized.values!;
  const keys = Object.keys(values);
  if (keys.length === 0) return res.status(400).json({ error: 'No valid fields supplied' });

  const assignments = keys.map((key) => `${camelToSnake(key)} = ?`).join(', ');
  const sql = `UPDATE ${entity.table} SET ${assignments} WHERE id = ?`;
  try {
    sqlite.prepare(sql).run(...keys.map((key) => values[key] as any), id);
    const after = sqlite.prepare(`SELECT * FROM ${entity.table} WHERE id = ?`).get(id);
    audit(req, 'CONTENT_UPDATED', req.params.entity, id, before, after);
    return res.json({ success: true, record: after });
  } catch (err) {
    return constraintAwareError(res, err);
  }
});

adminRouter.delete('/content/:entity/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const entity = getEntity(req.params.entity);
  if (!entity) return res.status(404).json({ error: 'Unknown content type' });
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid record ID' });

  const before = sqlite.prepare(`SELECT * FROM ${entity.table} WHERE id = ?`).get(id);
  if (!before) return res.status(404).json({ error: 'Record not found' });

  try {
    sqlite.prepare(`DELETE FROM ${entity.table} WHERE id = ?`).run(id);
    audit(req, 'CONTENT_DELETED', req.params.entity, id, before, null);
    return res.json({ success: true });
  } catch (err) {
    return constraintAwareError(res, err);
  }
});

adminRouter.post('/content/:entity/bulk', authenticate, requireContentEditor, (req: Request, res: Response) => {
  const entity = getEntity(req.params.entity);
  if (!entity) return res.status(404).json({ error: 'Unknown content type' });
  const parsed = z.object({ records: z.array(z.record(z.string(), z.unknown())).min(1).max(500) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Provide 1-500 records' });

  const results: Array<{ index: number; success: boolean; id?: number; error?: string }> = [];
  const run = sqlite.transaction(() => {
    parsed.data.records.forEach((body, index) => {
      const sanitized = sanitizeRecord(entity, body, true);
      if (sanitized.error) {
        results.push({ index, success: false, error: sanitized.error });
        return;
      }
      const values = sanitized.values!;
      const keys = Object.keys(values);
      const sql = `INSERT INTO ${entity.table} (${keys.map(camelToSnake).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
      try {
        const result = sqlite.prepare(sql).run(...keys.map((key) => values[key] as any));
        results.push({ index, success: true, id: Number(result.lastInsertRowid) });
      } catch (err) {
        results.push({ index, success: false, error: (err as Error).message });
      }
    });
  });
  run();
  audit(req, 'CONTENT_BULK_CREATED', req.params.entity, 0, null, {
    requested: parsed.data.records.length,
    succeeded: results.filter((result) => result.success).length,
  });
  return res.json({ results, succeeded: results.filter((result) => result.success).length });
});

// ---------------------------------------------------------------------------
// Verification of academic records
// ---------------------------------------------------------------------------

const VerificationSchema = z.object({
  verificationStatus: z.enum([
    'verified',
    'verified_complete',
    'partially_verified',
    'under_verification',
    'unverified',
    'needs_update',
  ]),
  sourceUrl: z.string().url().max(2000).optional().or(z.literal('')),
  sourceInstitution: z.string().trim().max(500).optional(),
  supportingDocumentationUrl: z.string().url().max(2000).optional().or(z.literal('')),
  notes: z.string().trim().max(4000).optional(),
  licensingStatus: z.string().trim().max(100).optional(),
  accreditationStatus: z.string().trim().max(100).optional(),
});

adminRouter.post(
  '/universities/:id/verify',
  authenticate,
  requireRole('super_admin', 'admin', 'academic_editor', 'academic_reviewer'),
  (req: Request, res: Response) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid institution ID' });
    const parsed = VerificationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid verification data' });

    const before = sqlite.prepare('SELECT * FROM universities WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!before) return res.status(404).json({ error: 'Institution not found' });

    const now = new Date().toISOString();
    const status =
      parsed.data.verificationStatus === 'verified' ? 'verified_complete' : parsed.data.verificationStatus;
    sqlite
      .prepare(
        `UPDATE universities SET
           general_verification_status = ?,
           last_verified_at = ?,
           source_url = COALESCE(NULLIF(?, ''), source_url),
           supporting_documentation_url = COALESCE(NULLIF(?, ''), supporting_documentation_url),
           verification_notes = COALESCE(?, verification_notes),
           licensing_status = COALESCE(?, licensing_status),
           accreditation_status = COALESCE(?, accreditation_status),
           collected_at = COALESCE(collected_at, ?),
           updated_at = ?
         WHERE id = ?`,
      )
      .run(
        status,
        parsed.data.verificationStatus === 'unverified' ? null : now,
        parsed.data.sourceUrl || '',
        parsed.data.supportingDocumentationUrl || '',
        parsed.data.notes || null,
        parsed.data.licensingStatus || null,
        parsed.data.accreditationStatus || null,
        now,
        now,
        id,
      );

    const after = sqlite.prepare('SELECT * FROM universities WHERE id = ?').get(id);
    audit(req, 'INSTITUTION_VERIFICATION_UPDATED', 'university', id, before, after);
    return res.json({ success: true, record: after });
  },
);

// ---------------------------------------------------------------------------
// Administrative backup listing and creation
// ---------------------------------------------------------------------------

adminRouter.get('/backups', authenticate, requireAdmin, (_req: Request, res: Response) => {
  return res.json({ backups: listDatabaseBackups() });
});

adminRouter.post('/backups', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  const result = await createDatabaseBackup();
  if (!result.success) return res.status(500).json({ error: result.error || 'Backup failed' });
  return res.status(201).json({ success: true, backup: result.fileName });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function constraintAwareError(res: Response, err: unknown) {
  const code = (err as { code?: string }).code;
  if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'A record with this unique value already exists' });
  }
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(409).json({ error: 'A referenced record does not exist' });
  }
  if (code === 'SQLITE_CONSTRAINT_TRIGGER' || code?.startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({ error: 'The change violates a database constraint' });
  }
  console.error('[admin] database error:', (err as Error).message);
  return res.status(500).json({ error: 'Database operation failed' });
}

// Keep Drizzle table references imported so unused-import checks stay honest
// for future typed queries in this module.
void universities;
void faculties;
void departments;
void academicPrograms;
void courses;
void libraryReferences;
void uploadedDocuments;
void users;
void sources;
void eq;
void desc;
