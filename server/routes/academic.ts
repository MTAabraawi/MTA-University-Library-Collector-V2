/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.ts';
import {
  countries,
  universities,
  faculties,
  departments,
  academicPrograms,
  studyPlans,
  semesters,
  courses,
  studyPlanSemesterCourses,
  coursePrerequisites,
  libraryReferences,
  sources,
  campuses,
  userSavedItems,
  readingLists,
  readingListItems,
  users,
  uploadedDocuments,
} from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, type AuthenticatedUser } from './auth.ts';
import { PrerequisiteDAGValidator } from '../utils/dag.ts';

export const academicRouter = Router();

const SAVED_ITEM_TYPES = ['university', 'program', 'course', 'reference', 'document'] as const;

function parseId(value: string): number | null {
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function matches(value: string | null | undefined, query: string): boolean {
  return Boolean(value && value.toLowerCase().includes(query));
}

// 1. GET /api/academic/countries
academicRouter.get('/countries', (_req: Request, res: Response) => {
  try {
    const rows = db.select().from(countries).all();
    return res.json({ countries: rows });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// 2. GET /api/academic/institutions
academicRouter.get('/institutions', (req: Request, res: Response) => {
  const { sector, governorate, licensing, accreditation, verification, q } = req.query;
  try {
    let rows = db.select().from(universities).all();

    if (sector && sector !== 'all') rows = rows.filter((u) => u.sector === sector);
    if (governorate && governorate !== 'all') rows = rows.filter((u) => u.governorateId === governorate);
    if (licensing && licensing !== 'all') rows = rows.filter((u) => u.licensingStatus === licensing);
    if (accreditation && accreditation !== 'all') rows = rows.filter((u) => u.accreditationStatus === accreditation);
    if (verification && verification !== 'all') {
      rows = rows.filter((u) => u.generalVerificationStatus === verification);
    }
    if (q) {
      const query = String(q).toLowerCase().trim();
      rows = rows.filter(
        (u) =>
          matches(u.nameAr, query) ||
          matches(u.nameEn, query) ||
          matches(u.nameShort, query) ||
          matches(u.governorateAr, query) ||
          matches(u.governorateEn, query),
      );
    }

    return res.json({ institutions: rows, total: rows.length });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch institutions' });
  }
});

// 3. GET /api/academic/institutions/:id — full dossier
academicRouter.get('/institutions/:id', (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const institution = db.select().from(universities).where(eq(universities.id, id)).get();
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    const facultyRows = db.select().from(faculties).where(eq(faculties.universityId, id)).all();
    const departmentRows =
      facultyRows.length === 0
        ? []
        : db.select().from(departments).all().filter((d) => facultyRows.some((f) => f.id === d.facultyId));
    const programs = db.select().from(academicPrograms).where(eq(academicPrograms.universityId, id)).all();
    const campusRows = db.select().from(campuses).where(eq(campuses.universityId, id)).all();

    return res.json({
      institution,
      campuses: campusRows,
      faculties: facultyRows,
      departments: departmentRows,
      programs,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch institution dossier' });
  }
});

// 4. GET /api/academic/faculties?universityId=
academicRouter.get('/faculties', (req: Request, res: Response) => {
  const universityId = req.query.universityId ? parseId(String(req.query.universityId)) : null;
  try {
    let rows = db.select().from(faculties).all();
    if (universityId) rows = rows.filter((f) => f.universityId === universityId);
    return res.json({ faculties: rows });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch faculties' });
  }
});

// 5. GET /api/academic/departments?facultyId=
academicRouter.get('/departments', (req: Request, res: Response) => {
  const facultyId = req.query.facultyId ? parseId(String(req.query.facultyId)) : null;
  try {
    let rows = db.select().from(departments).all();
    if (facultyId) rows = rows.filter((d) => d.facultyId === facultyId);
    return res.json({ departments: rows });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// 6. GET /api/academic/programs
academicRouter.get('/programs', (req: Request, res: Response) => {
  const { universityId, degree, q } = req.query;
  try {
    let rows = db.select().from(academicPrograms).all();
    if (universityId) {
      const uId = parseId(String(universityId));
      if (uId) rows = rows.filter((p) => p.universityId === uId);
    }
    if (degree && degree !== 'all') rows = rows.filter((p) => p.degreeLevel === degree);
    if (q) {
      const query = String(q).toLowerCase().trim();
      rows = rows.filter((p) => matches(p.nameAr, query) || matches(p.nameEn, query));
    }
    return res.json({ programs: rows });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch academic programs' });
  }
});

// 7. GET /api/academic/programs/:id
academicRouter.get('/programs/:id', (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid program ID' });
  try {
    const program = db.select().from(academicPrograms).where(eq(academicPrograms.id, id)).get();
    if (!program) return res.status(404).json({ error: 'Program not found' });
    const university = db.select().from(universities).where(eq(universities.id, program.universityId)).get();
    const faculty = db.select().from(faculties).where(eq(faculties.id, program.facultyId)).get();
    const department = db.select().from(departments).where(eq(departments.id, program.departmentId)).get();
    return res.json({ program, university, faculty, department });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch program' });
  }
});

// 8. GET /api/academic/study-plans/:programId
academicRouter.get('/study-plans/:programId', (req: Request, res: Response) => {
  const programId = parseId(req.params.programId);
  if (!programId) return res.status(400).json({ error: 'Invalid program ID' });

  try {
    const plans = db.select().from(studyPlans).where(eq(studyPlans.programId, programId)).all();
    if (plans.length === 0) return res.json({ plans: [], activePlan: null, semesters: [] });

    const activePlan = plans.find((p) => p.isActive) || plans[0];
    const semRows = db.select().from(semesters).where(eq(semesters.studyPlanId, activePlan.id)).all();
    const semestersWithCourses = semRows.map((semester) => {
      const links = db
        .select()
        .from(studyPlanSemesterCourses)
        .where(eq(studyPlanSemesterCourses.semesterId, semester.id))
        .all();
      const semCourses = links
        .map((link) => {
          const course = db.select().from(courses).where(eq(courses.id, link.courseId)).get();
          if (!course) return null;
          const prerequisiteLinks = db
            .select()
            .from(coursePrerequisites)
            .where(eq(coursePrerequisites.courseId, course.id))
            .all();
          const prerequisites = prerequisiteLinks
            .map((pl) => db.select({ code: courses.code }).from(courses).where(eq(courses.id, pl.prerequisiteCourseId)).get()?.code)
            .filter((code): code is string => Boolean(code));
          return { ...course, requirementType: link.requirementType, prerequisites };
        })
        .filter((course): course is NonNullable<typeof course> => course !== null);
      return { ...semester, courses: semCourses };
    });

    return res.json({ plans, activePlan, semesters: semestersWithCourses });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch study plan' });
  }
});

// 9. GET /api/academic/courses
academicRouter.get('/courses', (req: Request, res: Response) => {
  const { q, discipline, verification } = req.query;
  try {
    let rows = db.select().from(courses).all();
    if (discipline && discipline !== 'all') {
      rows = rows.filter((c) => c.disciplineAr === discipline || c.disciplineEn === discipline);
    }
    if (verification && verification !== 'all') {
      rows = rows.filter((c) => c.verificationStatus === verification);
    }
    if (q) {
      const query = String(q).toLowerCase().trim();
      rows = rows.filter((c) => matches(c.code, query) || matches(c.titleAr, query) || matches(c.titleEn, query));
    }

    const enriched = rows.map((course) => {
      const prerequisites = db
        .select()
        .from(coursePrerequisites)
        .where(eq(coursePrerequisites.courseId, course.id))
        .all()
        .map((pr) => db.select({ code: courses.code }).from(courses).where(eq(courses.id, pr.prerequisiteCourseId)).get()?.code)
        .filter((code): code is string => Boolean(code));
      return {
        ...course,
        objectivesAr: parseJsonArray(course.objectivesAr),
        objectivesEn: parseJsonArray(course.objectivesEn),
        topicsAr: parseJsonArray(course.topicsAr),
        topicsEn: parseJsonArray(course.topicsEn),
        prerequisites,
      };
    });

    return res.json({ courses: enriched, total: enriched.length });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch course catalog' });
  }
});

// 10. GET /api/academic/courses/:id
academicRouter.get('/courses/:id', (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid course ID' });
  try {
    const course = db.select().from(courses).where(eq(courses.id, id)).get();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const prerequisites = db
      .select()
      .from(coursePrerequisites)
      .where(eq(coursePrerequisites.courseId, id))
      .all();
    return res.json({
      course: {
        ...course,
        objectivesAr: parseJsonArray(course.objectivesAr),
        objectivesEn: parseJsonArray(course.objectivesEn),
        topicsAr: parseJsonArray(course.topicsAr),
        topicsEn: parseJsonArray(course.topicsEn),
      },
      prerequisites,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// 11. POST /api/academic/prerequisites/validate
academicRouter.post('/prerequisites/validate', (req: Request, res: Response) => {
  const parsed = z
    .object({
      courseId: z.coerce.number().int().positive(),
      prerequisiteCourseId: z.coerce.number().int().positive(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Course and prerequisite IDs are required' });

  try {
    const existing = db.select().from(coursePrerequisites).all();
    const result = PrerequisiteDAGValidator.wouldCreateCycle(
      existing.map((edge) => ({
        courseId: edge.courseId,
        prerequisiteCourseId: edge.prerequisiteCourseId,
        ruleType: edge.ruleType as 'AND' | 'OR',
      })),
      parsed.data.courseId,
      parsed.data.prerequisiteCourseId,
    );
    return res.json({
      valid: !result.hasCycle,
      hasCycle: result.hasCycle,
      cyclePath: result.cyclePath,
      message: result.hasCycle
        ? 'Prerequisite relationship rejected: it creates a circular dependency.'
        : 'Prerequisite relationship is acyclic and safe to link.',
    });
  } catch {
    return res.status(500).json({ error: 'Cycle validation failed' });
  }
});

// 12. GET /api/academic/library
academicRouter.get('/library', (req: Request, res: Response) => {
  const { type, discipline, q, language, access, verification } = req.query;
  try {
    let rows = db.select().from(libraryReferences).all();
    if (type && type !== 'all') rows = rows.filter((r) => r.resourceType === type);
    if (discipline && discipline !== 'all') rows = rows.filter((r) => r.discipline === discipline);
    if (language && language !== 'all') rows = rows.filter((r) => r.language === language);
    if (access && access !== 'all') rows = rows.filter((r) => r.accessType === access);
    if (verification && verification !== 'all') rows = rows.filter((r) => r.verificationStatus === verification);
    if (q) {
      const query = String(q).toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          matches(r.titleAr, query) ||
          matches(r.titleEn, query) ||
          matches(r.authors, query) ||
          matches(r.publisher, query) ||
          matches(r.doi, query) ||
          matches(r.isbn, query),
      );
    }
    return res.json({ references: rows, total: rows.length });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch academic library references' });
  }
});

// 13. GET /api/academic/library/:id
academicRouter.get('/library/:id', (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid reference ID' });
  try {
    const reference = db.select().from(libraryReferences).where(eq(libraryReferences.id, id)).get();
    if (!reference) return res.status(404).json({ error: 'Reference not found' });
    return res.json({ reference });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch reference' });
  }
});

// 14. GET /api/academic/sources
academicRouter.get('/sources', (_req: Request, res: Response) => {
  try {
    const rows = db.select().from(sources).all();
    return res.json({ sources: rows });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch official sources' });
  }
});

// 15. GET /api/academic/search — unified public search
academicRouter.get('/search', (req: Request, res: Response) => {
  const query = String(req.query.q || '').toLowerCase().trim();
  const type = String(req.query.type || 'all');
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '40'), 10) || 40));

  if (query.length < 2) {
    return res.json({ results: [], total: 0, query, message: 'Enter at least two characters' });
  }

  try {
    const results: Array<{
      id: number;
      type: 'university' | 'program' | 'course' | 'reference' | 'document';
      titleAr: string;
      titleEn: string;
      subtitleAr: string;
      subtitleEn: string;
    }> = [];

    if (type === 'all' || type === 'university') {
      for (const u of db.select().from(universities).all()) {
        if (matches(u.nameAr, query) || matches(u.nameEn, query) || matches(u.governorateAr, query) || matches(u.governorateEn, query)) {
          results.push({
            id: u.id,
            type: 'university',
            titleAr: u.nameAr,
            titleEn: u.nameEn,
            subtitleAr: `${u.governorateAr} · ${u.sector}`,
            subtitleEn: `${u.governorateEn} · ${u.sector}`,
          });
        }
      }
    }

    if (type === 'all' || type === 'program') {
      const universityRows = db.select().from(universities).all();
      for (const p of db.select().from(academicPrograms).all()) {
        if (matches(p.nameAr, query) || matches(p.nameEn, query)) {
          const university = universityRows.find((u) => u.id === p.universityId);
          results.push({
            id: p.id,
            type: 'program',
            titleAr: p.nameAr,
            titleEn: p.nameEn,
            subtitleAr: university ? university.nameAr : '',
            subtitleEn: `${university?.nameEn || ''} · ${p.degreeLevel}`,
          });
        }
      }
    }

    if (type === 'all' || type === 'course') {
      for (const c of db.select().from(courses).all()) {
        if (matches(c.code, query) || matches(c.titleAr, query) || matches(c.titleEn, query) || matches(c.disciplineAr, query) || matches(c.disciplineEn, query)) {
          results.push({
            id: c.id,
            type: 'course',
            titleAr: `${c.titleAr} (${c.code})`,
            titleEn: `${c.titleEn} (${c.code})`,
            subtitleAr: `${c.disciplineAr} · ${c.credits} credits`,
            subtitleEn: `${c.disciplineEn} · ${c.credits} credits`,
          });
        }
      }
    }

    if (type === 'all' || type === 'reference') {
      for (const r of db.select().from(libraryReferences).all()) {
        if (matches(r.titleAr, query) || matches(r.titleEn, query) || matches(r.authors, query) || matches(r.doi, query) || matches(r.isbn, query)) {
          results.push({
            id: r.id,
            type: 'reference',
            titleAr: r.titleAr,
            titleEn: r.titleEn,
            subtitleAr: `${r.authors} · ${r.publicationYear}`,
            subtitleEn: `${r.authors} · ${r.publicationYear}`,
          });
        }
      }
    }

    if (type === 'all' || type === 'document') {
      for (const d of db.select().from(uploadedDocuments).all()) {
        if (d.status !== 'published') continue;
        if (matches(d.title, query) || matches(d.authorName, query) || matches(d.description, query)) {
          results.push({
            id: d.id,
            type: 'document',
            titleAr: d.title,
            titleEn: d.title,
            subtitleAr: d.authorName || '',
            subtitleEn: d.authorName || '',
          });
        }
      }
    }

    return res.json({ results: results.slice(0, limit), total: results.length, query });
  } catch {
    return res.status(500).json({ error: 'Search failed' });
  }
});

// 16. GET /api/academic/analytics/summary — real database counts only
academicRouter.get('/analytics/summary', (_req: Request, res: Response) => {
  try {
    const count = (table: any) => db.select().from(table).all().length;
    return res.json({
      telemetry: {
        totalInstitutions: count(universities),
        totalFaculties: count(faculties),
        totalPrograms: count(academicPrograms),
        totalCourses: count(courses),
        totalReferences: count(libraryReferences),
        totalOfficialSources: count(sources),
        totalCommunityUploads: count(uploadedDocuments),
        publishedCommunityDocuments: db
          .select()
          .from(uploadedDocuments)
          .where(eq(uploadedDocuments.status, 'published'))
          .all().length,
        registeredUsers: count(users),
        countriesSupported: count(countries),
        advertisingStatus: 'disabled_by_default',
        analyticsMode: 'privacy_preserving_consent_opt_in',
        databaseEngine: 'SQLite (development default) / PostgreSQL schema included (not enabled in this runtime)',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch {
    return res.status(500).json({ error: 'Failed to generate telemetry' });
  }
});

// 16b. GET /api/academic/coverage/barometer — detailed live SQL breakdown
academicRouter.get('/coverage/barometer', (_req: Request, res: Response) => {
  try {
    const allInstitutions = db.select().from(universities).all();
    const countBy = (field: keyof typeof allInstitutions[0]) => {
      const counts: Record<string, number> = {};
      for (const inst of allInstitutions) {
        const val = String(inst[field] || 'unknown');
        counts[val] = (counts[val] || 0) + 1;
      }
      return counts;
    };

    return res.json({
      totalInstitutions: allInstitutions.length,
      verificationDistribution: countBy('generalVerificationStatus'),
      sectorDistribution: countBy('sector'),
      licensingDistribution: countBy('licensingStatus'),
      accreditationDistribution: countBy('accreditationStatus'),
      facultiesCount: db.select().from(faculties).all().length,
      programsCount: db.select().from(academicPrograms).all().length,
      coursesCount: db.select().from(courses).all().length,
      referencesCount: db.select().from(libraryReferences).all().length,
      sourcesCount: db.select().from(sources).all().length,
      generatedAt: new Date().toISOString(),
      isRealData: true,
      notes: 'Every figure is computed from live SQLite records. No fabricated statistics or demo estimates.',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to compute coverage barometer' });
  }
});

// 17. Saved items (personal library / reading list)
academicRouter.get('/saved-items', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const items = db
      .select()
      .from(userSavedItems)
      .where(eq(userSavedItems.userId, user.id))
      .orderBy(desc(userSavedItems.createdAt))
      .all();

    // Enrich each saved row with a display title/subtitle so the client never
    // has to guess what an item ID refers to. Unpublished documents are not
    // disclosed, even to a user who saved them before moderation completed.
    const enriched = items.map((item) => {
      let titleAr: string | undefined;
      let titleEn: string | undefined;
      let subtitleAr: string | undefined;
      let subtitleEn: string | undefined;

      try {
        if (item.itemType === 'university') {
          const row = db.select().from(universities).where(eq(universities.id, item.itemId)).get();
          titleAr = row?.nameAr;
          titleEn = row?.nameEn;
          subtitleAr = row?.governorateAr;
          subtitleEn = row?.governorateEn;
        } else if (item.itemType === 'program') {
          const row = db.select().from(academicPrograms).where(eq(academicPrograms.id, item.itemId)).get();
          titleAr = row?.nameAr;
          titleEn = row?.nameEn;
          subtitleAr = row?.degreeLevel ? String(row.degreeLevel) : undefined;
          subtitleEn = subtitleAr;
        } else if (item.itemType === 'course') {
          const row = db.select().from(courses).where(eq(courses.id, item.itemId)).get();
          titleAr = row?.titleAr;
          titleEn = row?.titleEn;
          subtitleAr = row ? `${row.code} · ${row.credits} ساعة` : undefined;
          subtitleEn = row ? `${row.code} · ${row.credits} credits` : undefined;
        } else if (item.itemType === 'reference') {
          const row = db.select().from(libraryReferences).where(eq(libraryReferences.id, item.itemId)).get();
          titleAr = row?.titleAr;
          titleEn = row?.titleEn;
          subtitleAr = row ? `${row.authors} · ${row.publicationYear}` : undefined;
          subtitleEn = subtitleAr;
        } else if (item.itemType === 'document') {
          const row = db.select().from(uploadedDocuments).where(eq(uploadedDocuments.id, item.itemId)).get();
          if (row && row.status === 'published') {
            titleAr = row.title;
            titleEn = row.title;
            subtitleAr = row.authorName || undefined;
            subtitleEn = row.authorName || undefined;
          }
        }
      } catch {
        // A saved item may point at a record removed by an administrator.
        // Keep the row visible with its type and identifier instead of failing.
      }

      return { ...item, titleAr, titleEn, subtitleAr, subtitleEn };
    });

    return res.json({ items: enriched });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch saved items' });
  }
});

academicRouter.post('/saved-items', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const parsed = z
    .object({
      itemType: z.enum(SAVED_ITEM_TYPES),
      itemId: z.coerce.number().int().positive(),
      notes: z.string().trim().max(2000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid saved item data' });

  try {
    const existing = db
      .select()
      .from(userSavedItems)
      .where(
        and(
          eq(userSavedItems.userId, user.id),
          eq(userSavedItems.itemType, parsed.data.itemType),
          eq(userSavedItems.itemId, parsed.data.itemId),
        ),
      )
      .get();
    if (existing) return res.json({ success: true, item: existing });

    const item = db
      .insert(userSavedItems)
      .values({
        userId: user.id,
        itemType: parsed.data.itemType,
        itemId: parsed.data.itemId,
        notes: parsed.data.notes || null,
      })
      .returning()
      .get();
    return res.status(201).json({ success: true, item });
  } catch {
    return res.status(500).json({ error: 'Failed to save item' });
  }
});

academicRouter.delete('/saved-items/:id', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });

  try {
    db.delete(userSavedItems)
      .where(and(eq(userSavedItems.id, id), eq(userSavedItems.userId, user.id)))
      .run();
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete saved item' });
  }
});

// 18. Reading lists
academicRouter.get('/reading-lists', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  try {
    const lists = db.select().from(readingLists).where(eq(readingLists.userId, user.id)).all();
    const withItems = lists.map((list) => ({
      ...list,
      items: db.select().from(readingListItems).where(eq(readingListItems.readingListId, list.id)).all(),
    }));
    return res.json({ readingLists: withItems });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch reading lists' });
  }
});

academicRouter.post('/reading-lists', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(160),
      description: z.string().trim().max(2000).optional(),
      isPublic: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid reading list data' });
  try {
    const list = db
      .insert(readingLists)
      .values({
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        isPublic: parsed.data.isPublic ?? false,
      })
      .returning()
      .get();
    return res.status(201).json({ readingList: list });
  } catch {
    return res.status(500).json({ error: 'Failed to create reading list' });
  }
});

academicRouter.post('/reading-lists/:id/items', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const listId = parseId(req.params.id);
  if (!listId) return res.status(400).json({ error: 'Invalid reading list ID' });
  const parsed = z
    .object({
      itemType: z.enum(SAVED_ITEM_TYPES),
      itemId: z.coerce.number().int().positive(),
      notes: z.string().trim().max(2000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid reading list item' });

  try {
    const list = db
      .select()
      .from(readingLists)
      .where(and(eq(readingLists.id, listId), eq(readingLists.userId, user.id)))
      .get();
    if (!list) return res.status(404).json({ error: 'Reading list not found' });

    const existingItems = db
      .select()
      .from(readingListItems)
      .where(eq(readingListItems.readingListId, listId))
      .all();
    const item = db
      .insert(readingListItems)
      .values({
        readingListId: listId,
        itemType: parsed.data.itemType,
        itemId: parsed.data.itemId,
        position: existingItems.length,
        notes: parsed.data.notes || null,
      })
      .returning()
      .get();
    return res.status(201).json({ item });
  } catch {
    return res.status(500).json({ error: 'Failed to add reading list item' });
  }
});

academicRouter.delete('/reading-lists/:id', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | null;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const listId = parseId(req.params.id);
  if (!listId) return res.status(400).json({ error: 'Invalid reading list ID' });
  try {
    const list = db
      .select()
      .from(readingLists)
      .where(and(eq(readingLists.id, listId), eq(readingLists.userId, user.id)))
      .get();
    if (!list) return res.status(404).json({ error: 'Reading list not found' });
    db.delete(readingListItems).where(eq(readingListItems.readingListId, listId)).run();
    db.delete(readingLists).where(eq(readingLists.id, listId)).run();
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete reading list' });
  }
});
