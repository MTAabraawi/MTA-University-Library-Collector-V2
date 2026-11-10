/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db, QUARANTINE_DIR, APPROVED_DIR } from '../db/index.ts';
import {
  uploadedDocuments,
  documentReports,
  documentReviewActions,
  documentCategories,
  courses,
  verificationAuditLogs,
} from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { authenticate, requireRole, canModerate, type AuthenticatedUser } from './auth.ts';
import { config } from '../config.ts';
import { rateLimit } from '../middleware.ts';

export const documentsRouter = Router();

for (const dir of [QUARANTINE_DIR, APPROVED_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const ALLOWED_CATEGORY_CODES = [
  'course_summary',
  'lecture_notes',
  'study_guide',
  'research_paper',
  'open_book',
];

const REPORT_REASONS = [
  'copyright_infringement',
  'inappropriate_content',
  'incorrect_metadata',
  'malware_suspicion',
  'other',
] as const;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, QUARANTINE_DIR),
  filename: (_req, file, cb) => {
    const randomHex = crypto.randomBytes(16).toString('hex');
    // Never trust the client filename for the stored name. Only a validated
    // .pdf extension is retained.
    const ext = path.extname(file.originalname).toLowerCase() === '.pdf' ? '.pdf' : '.bin';
    cb(null, `doc_${Date.now()}_${randomHex}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes, files: 1, fields: 40 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') return cb(new Error('Only PDF files (.pdf) are permitted'));
    if (file.mimetype !== 'application/pdf') return cb(new Error('Invalid MIME type; expected application/pdf'));
    return cb(null, true);
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.uploadRateLimitPerHour,
  keyPrefix: 'document-upload',
  message: 'Upload limit reached. Please try again later.',
});

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.reportRateLimitPerHour,
  keyPrefix: 'document-report',
  message: 'Too many reports submitted. Please try again later.',
});

interface PdfInspection {
  isValid: boolean;
  error?: string;
  securityNotes?: string;
}

/**
 * Structural PDF screening:
 * - `%PDF-` signature at byte 0
 * - non-trivial body and a closing %%EOF marker
 * - rejects active/executable PDF features (JavaScript, launch actions,
 *   embedded files, auto OpenAction) that have no place in a static academic PDF.
 *
 * This is a first-line screen, not a replacement for an antivirus engine. The
 * deployment notes explain how to add ClamAV without changing this workflow.
 */
function inspectPDFFile(filePath: string): PdfInspection {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < 64) return { isValid: false, error: 'File is too small to be a valid PDF' };
    if (stat.size > config.maxUploadBytes) return { isValid: false, error: 'File exceeds the maximum size' };

    const fd = fs.openSync(filePath, 'r');
    try {
      const header = Buffer.alloc(8);
      fs.readSync(fd, header, 0, 8, 0);
      if (!header.toString('latin1', 0, 5).startsWith('%PDF-')) {
        return { isValid: false, error: 'Missing PDF file signature' };
      }

      const tailLength = Math.min(2048, stat.size);
      const tail = Buffer.alloc(tailLength);
      fs.readSync(fd, tail, 0, tailLength, stat.size - tailLength);
      if (!tail.toString('latin1').includes('%%EOF')) {
        return { isValid: false, error: 'PDF structure is incomplete (missing %%EOF)' };
      }
    } finally {
      fs.closeSync(fd);
    }

    // Read as latin1 so binary streams are not decoded as UTF-8 incorrectly.
    const contents = fs.readFileSync(filePath).toString('latin1');
    const activeFeatures = [
      { pattern: /\/JavaScript\b/, name: 'JavaScript' },
      { pattern: /\/JS\b/, name: 'JavaScript action' },
      { pattern: /\/Launch\b/, name: 'launch action' },
      { pattern: /\/EmbeddedFile\b/, name: 'embedded file' },
      { pattern: /\/OpenAction\b/, name: 'automatic open action' },
      { pattern: /\/RichMedia\b/, name: 'rich media' },
    ];
    const found = activeFeatures.filter((feature) => feature.pattern.test(contents)).map((f) => f.name);
    if (found.length > 0) {
      return {
        isValid: false,
        error: `PDF contains active content that is not permitted (${found.join(', ')})`,
        securityNotes: `Rejected active PDF features: ${found.join(', ')}`,
      };
    }

    return { isValid: true, securityNotes: 'Signature, EOF marker and static-content checks passed' };
  } catch (err) {
    return { isValid: false, error: (err as Error).message };
  }
}

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function safeUnlink(filePath: string | undefined) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // best effort cleanup
    }
  }
}

function isInside(parent: string, candidate: string): boolean {
  const resolvedParent = path.resolve(parent) + path.sep;
  const resolvedCandidate = path.resolve(candidate);
  return resolvedCandidate.startsWith(resolvedParent);
}

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

const MetadataSchema = z.object({
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().max(4000).optional().default(''),
  authorName: z.string().trim().max(300).optional().default(''),
  publicationYear: z.coerce.number().int().min(1400).max(new Date().getFullYear() + 1).optional(),
  originalSource: z.string().trim().max(2000).optional().default(''),
  categoryCode: z.enum(ALLOWED_CATEGORY_CODES as [string, ...string[]]).default('course_summary'),
  universityId: z.coerce.number().int().positive().optional(),
  facultyId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  programId: z.coerce.number().int().positive().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  courseCode: z.string().trim().max(32).optional().default(''),
  semesterNumber: z.coerce.number().int().min(1).max(20).optional(),
  language: z.enum(['ar', 'en']).default('ar'),
  licenseType: z.string().trim().min(3).max(200).default('unknown'),
  copyrightDeclarationAccepted: z.union([z.literal('true'), z.literal('on'), z.boolean()]).optional(),
  submitterName: z.string().trim().min(2).max(160).optional().default(''),
  submitterEmail: z.string().trim().email().max(320).optional().default(''),
  website: z.string().max(0).optional().default(''), // honeypot
});

function parseOptionalIds(body: Record<string, unknown>) {
  const out: Record<string, number> = {};
  for (const key of ['universityId', 'facultyId', 'departmentId', 'programId', 'courseId']) {
    const value = body[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      const parsed = Number.parseInt(String(value), 10);
      if (Number.isFinite(parsed) && parsed > 0) out[key] = parsed;
    }
  }
  return out;
}

// 1. POST /api/documents/upload — public contribution endpoint
documentsRouter.post(
  '/upload',
  uploadLimiter,
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('document')(req, res, (err) => {
      if (err) {
        const message =
          err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
            ? `File exceeds the ${Math.round(config.maxUploadBytes / (1024 * 1024))} MB limit`
            : err.message || 'Upload rejected';
        audit(req, 'UPLOAD_REJECTED_BY_PARSER', 'document', 0, null, { message });
        return res.status(400).json({ error: message });
      }
      return next();
    });
  },
  (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No PDF file was provided' });
    const tempPath = req.file.path;

    try {
      const metadata = MetadataSchema.safeParse(req.body);
      if (!metadata.success) {
        safeUnlink(tempPath);
        return res.status(400).json({ error: metadata.error.issues[0]?.message || 'Invalid metadata' });
      }
      const body = metadata.data;

      // Honeypot field: bots fill every field; real users never see it.
      if (body.website) {
        safeUnlink(tempPath);
        audit(req, 'UPLOAD_REJECTED_HONEYPOT', 'document', 0, null, { ip: req.ip });
        return res.status(400).json({ error: 'Submission rejected' });
      }

      const inspection = inspectPDFFile(tempPath);
      if (!inspection.isValid) {
        safeUnlink(tempPath);
        audit(req, 'UPLOAD_REJECTED_SECURITY_SCREEN', 'document', 0, null, {
          error: inspection.error,
          notes: inspection.securityNotes,
        });
        return res.status(400).json({ error: `Security screening failed: ${inspection.error}` });
      }

      const fileSha256 = sha256File(tempPath);
      const duplicate = db
        .select({ id: uploadedDocuments.id, status: uploadedDocuments.status })
        .from(uploadedDocuments)
        .where(eq(uploadedDocuments.fileSha256, fileSha256))
        .get();
      if (duplicate) {
        safeUnlink(tempPath);
        return res.status(409).json({
          error: 'This identical document has already been submitted to the academic library.',
          existingStatus: duplicate.status,
        });
      }

      const isCopyrightAccepted =
        body.copyrightDeclarationAccepted === true ||
        body.copyrightDeclarationAccepted === 'true' ||
        body.copyrightDeclarationAccepted === 'on';
      if (!isCopyrightAccepted) {
        safeUnlink(tempPath);
        return res.status(400).json({ error: 'The legal copyright declaration must be accepted.' });
      }

      const currentUser = (req as any).user as AuthenticatedUser | null;
      const submitterName = currentUser?.fullName || body.submitterName;
      const submitterEmail = currentUser?.email || body.submitterEmail;
      if (!submitterName || !submitterEmail) {
        safeUnlink(tempPath);
        return res.status(400).json({ error: 'Submitter name and email are required' });
      }

      const ids = parseOptionalIds(req.body as Record<string, unknown>);
      let courseId: number | undefined = ids.courseId;
      if (!courseId && body.courseCode) {
        const course = db
          .select({ id: courses.id })
          .from(courses)
          .where(eq(courses.code, body.courseCode.toUpperCase()))
          .get();
        courseId = course?.id;
      }

      const categoryExists = db
        .select({ id: documentCategories.id })
        .from(documentCategories)
        .where(eq(documentCategories.code, body.categoryCode))
        .get();
      if (!categoryExists) {
        safeUnlink(tempPath);
        return res.status(400).json({ error: 'Unknown document category' });
      }

      const now = new Date().toISOString();
      const inserted = db
        .insert(uploadedDocuments)
        .values({
          title: body.title,
          description: body.description || null,
          authorName: body.authorName || null,
          publicationYear: body.publicationYear ?? null,
          originalSource: body.originalSource || null,
          categoryCode: body.categoryCode,
          countryId: 1,
          universityId: ids.universityId ?? null,
          facultyId: ids.facultyId ?? null,
          departmentId: ids.departmentId ?? null,
          programId: ids.programId ?? null,
          courseId: courseId ?? null,
          semesterNumber: body.semesterNumber ?? null,
          language: body.language,
          licenseType: body.licenseType,
          copyrightDeclarationAccepted: true,
          submitterName,
          submitterEmail,
          submitterUserId: currentUser?.id ?? null,
          isVisitorSubmission: !currentUser,
          originalFilename: path.basename(req.file!.originalname).slice(0, 255),
          storedFilename: req.file!.filename,
          fileSizeBytes: req.file!.size,
          mimeType: 'application/pdf',
          fileSha256,
          storagePath: tempPath,
          status: 'screening',
          screeningResult: 'passed_static_checks',
          screeningAt: now,
          securityNotes: inspection.securityNotes ?? null,
          downloadAllowed: true,
        })
        .returning()
        .get();

      // Security screening is synchronous and passed; advance to academic review.
      db.update(uploadedDocuments)
        .set({
          status: 'pending_academic_review',
          academicReviewAt: now,
          updatedAt: now,
        })
        .where(eq(uploadedDocuments.id, inserted.id))
        .run();

      audit(req, 'DOCUMENT_SUBMITTED', 'document', inserted.id, null, {
        status: 'pending_academic_review',
        sha256: fileSha256,
        category: body.categoryCode,
        visitor: !currentUser,
      });

      return res.status(201).json({
        success: true,
        documentId: inserted.id,
        status: 'pending_academic_review',
        message:
          'Document passed security screening and is stored in quarantine. It will not be published until an academic reviewer approves and publishes it.',
      });
    } catch (err) {
      safeUnlink(tempPath);
      // Never echo internal paths or stack traces to the client.
      console.error('[documents] upload failed:', (err as Error).message);
      return res.status(500).json({ error: 'Upload failed while storing the submission' });
    }
  },
);

// 2. GET /api/documents/published — public, published documents only
documentsRouter.get('/published', (req: Request, res: Response) => {
  const { universityId, courseId, category, query, page, pageSize } = req.query;
  try {
    let docs = db
      .select()
      .from(uploadedDocuments)
      .where(eq(uploadedDocuments.status, 'published'))
      .orderBy(desc(uploadedDocuments.publishedAt))
      .all();

    if (universityId) docs = docs.filter((d) => d.universityId === Number(universityId));
    if (courseId) docs = docs.filter((d) => d.courseId === Number(courseId));
    if (category && category !== 'all') docs = docs.filter((d) => d.categoryCode === category);
    if (query) {
      const q = String(query).toLowerCase().trim();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.authorName || '').toLowerCase().includes(q) ||
          (d.description || '').toLowerCase().includes(q),
      );
    }

    const pageNumber = Math.max(1, Number.parseInt(String(page || '1'), 10) || 1);
    const size = Math.min(100, Math.max(1, Number.parseInt(String(pageSize || '50'), 10) || 50));
    const paged = docs.slice((pageNumber - 1) * size, pageNumber * size);

    const sanitized = paged.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      authorName: d.authorName,
      publicationYear: d.publicationYear,
      originalSource: d.originalSource,
      categoryCode: d.categoryCode,
      universityId: d.universityId,
      facultyId: d.facultyId,
      departmentId: d.departmentId,
      programId: d.programId,
      courseId: d.courseId,
      semesterNumber: d.semesterNumber,
      language: d.language,
      licenseType: d.licenseType,
      submitterName: d.submitterName,
      fileSizeBytes: d.fileSizeBytes,
      downloadCount: d.downloadCount,
      approvedAt: d.approvedAt,
      publishedAt: d.publishedAt,
    }));

    return res.json({ documents: sanitized, total: docs.length, page: pageNumber, pageSize: size });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch published documents' });
  }
});

// 3. GET /api/documents/:id/download — published, approved files only
documentsRouter.get('/:id/download', (req: Request, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid document ID' });

  try {
    const doc = db.select().from(uploadedDocuments).where(eq(uploadedDocuments.id, id)).get();
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.status !== 'published' || !doc.downloadAllowed) {
      return res.status(403).json({ error: 'Document is not available for public download' });
    }
    if (!doc.storagePath || !fs.existsSync(doc.storagePath)) {
      return res.status(404).json({ error: 'Document file is missing on the server' });
    }
    // Defence in depth: only files inside the approved directory may be streamed.
    if (!isInside(APPROVED_DIR, doc.storagePath)) {
      return res.status(403).json({ error: 'Document is not in the approved storage area' });
    }

    db.update(uploadedDocuments)
      .set({ downloadCount: doc.downloadCount + 1 })
      .where(eq(uploadedDocuments.id, id))
      .run();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalFilename)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return fs.createReadStream(doc.storagePath).pipe(res);
  } catch {
    return res.status(500).json({ error: 'Failed to stream document' });
  }
});

// 4. POST /api/documents/:id/report — public complaint / takedown request
documentsRouter.post('/:id/report', reportLimiter, authenticate, (req: Request, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid document ID' });

  const schema = z.object({
    reporterName: z.string().trim().min(2).max(160),
    reporterEmail: z.string().trim().email().max(320),
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().min(10).max(4000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid report data' });
  }

  try {
    const doc = db.select({ id: uploadedDocuments.id }).from(uploadedDocuments).where(eq(uploadedDocuments.id, id)).get();
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const currentUser = (req as any).user as AuthenticatedUser | null;
    db.insert(documentReports)
      .values({
        documentId: id,
        reporterName: parsed.data.reporterName,
        reporterEmail: parsed.data.reporterEmail,
        reporterUserId: currentUser?.id ?? null,
        reason: parsed.data.reason,
        details: parsed.data.details,
        status: 'open',
      })
      .run();

    audit(req, 'DOCUMENT_REPORT_SUBMITTED', 'document', id, null, { reason: parsed.data.reason });
    return res.status(201).json({
      success: true,
      message: 'Complaint received. Academic moderators will review it promptly.',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to submit report' });
  }
});

// 5. GET /api/documents/admin/review-queue
documentsRouter.get(
  '/admin/review-queue',
  authenticate,
  requireRole('super_admin', 'admin', 'academic_reviewer'),
  (_req: Request, res: Response) => {
    try {
      const docs = db.select().from(uploadedDocuments).orderBy(desc(uploadedDocuments.createdAt)).all();
      return res.json({
        documents: docs.map((doc) => ({
          ...doc,
          storagePath: undefined, // never expose server paths
        })),
      });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch review queue' });
    }
  },
);

// 6. GET /api/documents/admin/reports
documentsRouter.get(
  '/admin/reports',
  authenticate,
  requireRole('super_admin', 'admin', 'academic_reviewer'),
  (req: Request, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    try {
      let rows = db.select().from(documentReports).orderBy(desc(documentReports.createdAt)).all();
      if (status) rows = rows.filter((report) => report.status === status);
      return res.json({ reports: rows });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }
  },
);

// 7. PATCH /api/documents/admin/reports/:id — resolve a complaint
documentsRouter.patch(
  '/admin/reports/:id',
  authenticate,
  requireRole('super_admin', 'admin', 'academic_reviewer'),
  (req: Request, res: Response) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid report ID' });

    const parsed = z
      .object({
        status: z.enum(['open', 'investigating', 'resolved', 'dismissed']),
        resolutionNotes: z.string().trim().max(4000).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid report action' });

    try {
      const report = db.select().from(documentReports).where(eq(documentReports.id, id)).get();
      if (!report) return res.status(404).json({ error: 'Report not found' });
      const user = (req as any).user as AuthenticatedUser;

      db.update(documentReports)
        .set({
          status: parsed.data.status,
          resolutionNotes: parsed.data.resolutionNotes || null,
          resolvedAt: ['resolved', 'dismissed'].includes(parsed.data.status) ? new Date().toISOString() : null,
          resolvedByUserId: user.id,
        })
        .where(eq(documentReports.id, id))
        .run();

      audit(req, 'DOCUMENT_REPORT_UPDATED', 'document_report', id, report, {
        status: parsed.data.status,
      });
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to update report' });
    }
  },
);

type ModerationAction =
  | 'screen'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'unpublish'
  | 'quarantine';

function applyModerationAction(
  doc: typeof uploadedDocuments.$inferSelect,
  action: ModerationAction,
  notes: string | undefined,
  reviewerId: number,
): { status: typeof uploadedDocuments.$inferSelect.status; storagePath: string; rejectionReason: string | null } {
  let status: typeof uploadedDocuments.$inferSelect.status = doc.status;
  let storagePath = doc.storagePath;

  switch (action) {
    case 'screen': {
      const inspection = inspectPDFFile(doc.storagePath);
      if (!inspection.isValid) {
        throw new Error(`Security screening failed: ${inspection.error}`);
      }
      status = 'pending_academic_review';
      break;
    }
    case 'approve': {
      if (['published', 'rejected', 'quarantine'].includes(doc.status)) {
        throw new Error(`Cannot approve a document in status ${doc.status}`);
      }
      status = 'approved';
      storagePath = moveToApproved(doc);
      break;
    }
    case 'reject': {
      if (!notes || notes.trim().length < 3) {
        throw new Error('A rejection reason is required');
      }
      status = 'rejected';
      break;
    }
    case 'publish': {
      if (doc.status !== 'approved' && doc.status !== 'published') {
        throw new Error('A document must be approved before it can be published');
      }
      status = 'published';
      storagePath = moveToApproved(doc);
      break;
    }
    case 'unpublish': {
      if (doc.status !== 'published') throw new Error('Only published documents can be unpublished');
      status = 'approved';
      break;
    }
    case 'quarantine': {
      const target = path.join(QUARANTINE_DIR, doc.storedFilename);
      if (fs.existsSync(doc.storagePath) && doc.storagePath !== target) fs.renameSync(doc.storagePath, target);
      storagePath = target;
      status = 'quarantine';
      break;
    }
    default:
      throw new Error('Unknown moderation action');
  }

  return {
    status,
    storagePath,
    rejectionReason: action === 'reject' ? notes || null : doc.rejectionReason,
  };
}

function moveToApproved(doc: typeof uploadedDocuments.$inferSelect): string {
  const target = path.join(APPROVED_DIR, doc.storedFilename);
  if (doc.storagePath !== target) {
    if (!fs.existsSync(doc.storagePath)) throw new Error('The document file is missing from quarantine');
    fs.renameSync(doc.storagePath, target);
  }
  return target;
}

// 8. POST /api/documents/admin/:id/action
documentsRouter.post(
  '/admin/:id/action',
  authenticate,
  requireRole('super_admin', 'admin', 'academic_reviewer'),
  (req: Request, res: Response) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid document ID' });

    const parsed = z
      .object({
        action: z.enum(['screen', 'approve', 'reject', 'publish', 'unpublish', 'quarantine']),
        notes: z.string().trim().max(2000).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid moderation action' });

    try {
      const doc = db.select().from(uploadedDocuments).where(eq(uploadedDocuments.id, id)).get();
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const reviewer = (req as any).user as AuthenticatedUser;
      const outcome = applyModerationAction(doc, parsed.data.action, parsed.data.notes, reviewer.id);
      const now = new Date().toISOString();

      db.update(uploadedDocuments)
        .set({
          status: outcome.status,
          storagePath: outcome.storagePath,
          rejectionReason: outcome.rejectionReason,
          approvedAt: ['approved', 'published'].includes(outcome.status) ? doc.approvedAt || now : doc.approvedAt,
          approvedByUserId: ['approved', 'published'].includes(outcome.status)
            ? reviewer.id
            : doc.approvedByUserId,
          publishedAt: outcome.status === 'published' ? now : doc.publishedAt,
          quarantinedAt: outcome.status === 'quarantine' ? now : doc.quarantinedAt,
          securityNotes: parsed.data.notes || doc.securityNotes,
          updatedAt: now,
        })
        .where(eq(uploadedDocuments.id, id))
        .run();

      db.insert(documentReviewActions)
        .values({
          documentId: id,
          reviewerUserId: reviewer.id,
          action: parsed.data.action,
          notes: parsed.data.notes || null,
        })
        .run();

      audit(req, `DOCUMENT_${parsed.data.action.toUpperCase()}`, 'document', id, { status: doc.status }, {
        status: outcome.status,
        notes: parsed.data.notes || null,
      });

      return res.json({ success: true, status: outcome.status });
    } catch (err) {
      const message = (err as Error).message;
      const isClientError = /Cannot|must|required|missing|failed/i.test(message);
      return res.status(isClientError ? 409 : 500).json({
        error: isClientError ? message : 'Moderation action failed',
      });
    }
  },
);

// 9. POST /api/documents/admin/bulk-action — bulk moderation
documentsRouter.post(
  '/admin/bulk-action',
  authenticate,
  requireRole('super_admin', 'admin', 'academic_reviewer'),
  (req: Request, res: Response) => {
    const parsed = z
      .object({
        ids: z.array(z.number().int().positive()).min(1).max(200),
        action: z.enum(['screen', 'approve', 'reject', 'publish', 'unpublish', 'quarantine']),
        notes: z.string().trim().max(2000).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid bulk moderation request' });

    const reviewer = (req as any).user as AuthenticatedUser;
    const results: Array<{ id: number; success: boolean; status?: string; error?: string }> = [];

    for (const id of parsed.data.ids) {
      try {
        const doc = db.select().from(uploadedDocuments).where(eq(uploadedDocuments.id, id)).get();
        if (!doc) {
          results.push({ id, success: false, error: 'Document not found' });
          continue;
        }
        const outcome = applyModerationAction(doc, parsed.data.action, parsed.data.notes, reviewer.id);
        db.update(uploadedDocuments)
          .set({
            status: outcome.status,
            storagePath: outcome.storagePath,
            rejectionReason: outcome.rejectionReason,
            publishedAt: outcome.status === 'published' ? new Date().toISOString() : doc.publishedAt,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(uploadedDocuments.id, id))
          .run();
        db.insert(documentReviewActions)
          .values({
            documentId: id,
            reviewerUserId: reviewer.id,
            action: parsed.data.action,
            notes: parsed.data.notes || null,
          })
          .run();
        results.push({ id, success: true, status: outcome.status });
      } catch (err) {
        results.push({ id, success: false, error: (err as Error).message });
      }
    }

    audit(req, 'DOCUMENT_BULK_ACTION', 'document', 0, null, {
      action: parsed.data.action,
      ids: parsed.data.ids,
      results,
    });
    return res.json({ results, succeeded: results.filter((r) => r.success).length });
  },
);
