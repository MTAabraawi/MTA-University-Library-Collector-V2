/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.ts';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config, QUARANTINE_DIR, APPROVED_DIR } from '../config.ts';
import { runMigration0003 } from './migrations/0003_comprehensive_yemen_census.ts';
import { runMigration0004 } from './migrations/0004_faculties_programs_courses_census.ts';
import { runMigration0005 } from './migrations/0005_expanded_verified_curricula.ts';

// Ensure data/upload directories exist. The database file itself is never
// recreated or replaced here: migrations are additive only.
const DATA_DIR = config.dataDir;
const UPLOADS_DIR = config.uploadsDir;
const DB_PATH = config.dbPath;

for (const dir of [DATA_DIR, UPLOADS_DIR, QUARANTINE_DIR, APPROVED_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export const sqlite = new Database(DB_PATH);

// Enable WAL mode and foreign keys for SQLite performance & relational integrity
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite, { schema });
export { DB_PATH, DATA_DIR, UPLOADS_DIR, QUARANTINE_DIR, APPROVED_DIR };

// Helper to hash passwords securely using scrypt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(':');
  if (!salt || !key) return false;
  try {
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/** Runs a set of statements atomically. */
export function withTransaction<T>(fn: () => T): T {
  return sqlite.transaction(fn)();
}

/**
 * Initializes tables if not existing and seeds baseline data
 */
export function initializeDatabase() {
  // Execute DDL for SQLite
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS countries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      flag_emoji TEXT NOT NULL DEFAULT '🇾🇪',
      is_starting_country INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS universities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_id INTEGER NOT NULL REFERENCES countries(id),
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_short TEXT,
      sector TEXT NOT NULL DEFAULT 'public',
      governorate_id TEXT NOT NULL,
      governorate_ar TEXT NOT NULL,
      governorate_en TEXT NOT NULL,
      established_year INTEGER NOT NULL,
      website_url TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      logo_url TEXT,
      licensing_status TEXT NOT NULL DEFAULT 'license_under_verification',
      licensing_authority_ar TEXT,
      licensing_authority_en TEXT,
      licensing_decree_number TEXT,
      licensing_decree_date TEXT,
      accreditation_status TEXT NOT NULL DEFAULT 'accreditation_under_verification',
      accreditation_authority_ar TEXT,
      accreditation_authority_en TEXT,
      accreditation_certificate_number TEXT,
      accreditation_date TEXT,
      general_verification_status TEXT NOT NULL DEFAULT 'under_verification',
      last_verified_at TEXT,
      verification_notes TEXT,
      source_url TEXT,
      is_demo_record INTEGER NOT NULL DEFAULT 0,
      faculties_count INTEGER NOT NULL DEFAULT 0,
      programs_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL REFERENCES universities(id),
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      governorate_ar TEXT NOT NULL,
      governorate_en TEXT NOT NULL,
      city TEXT,
      address TEXT,
      is_main_campus INTEGER NOT NULL DEFAULT 0,
      established_year INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS faculties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL REFERENCES universities(id),
      campus_id INTEGER REFERENCES campuses(id),
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      dean_name TEXT,
      established_year INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id INTEGER NOT NULL REFERENCES faculties(id),
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      head_of_department TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL REFERENCES departments(id),
      faculty_id INTEGER NOT NULL REFERENCES faculties(id),
      university_id INTEGER NOT NULL REFERENCES universities(id),
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      degree_level TEXT NOT NULL DEFAULT 'Bachelor',
      study_type TEXT NOT NULL DEFAULT 'Regular',
      duration_years INTEGER NOT NULL DEFAULT 4,
      total_credits INTEGER NOT NULL DEFAULT 132,
      programmatic_accreditation TEXT NOT NULL DEFAULT 'accreditation_under_verification',
      programmatic_authority_ar TEXT,
      programmatic_authority_en TEXT,
      is_demo_record INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL REFERENCES academic_programs(id),
      version_year TEXT NOT NULL,
      version_name_ar TEXT NOT NULL,
      version_name_en TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      total_credits INTEGER NOT NULL,
      total_semesters INTEGER NOT NULL,
      approved_date TEXT,
      approval_decree TEXT,
      is_demo_record INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      study_plan_id INTEGER NOT NULL REFERENCES study_plans(id),
      semester_number INTEGER NOT NULL,
      academic_year_number INTEGER NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      min_credits INTEGER NOT NULL DEFAULT 12,
      max_credits INTEGER NOT NULL DEFAULT 21,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title_ar TEXT NOT NULL,
      title_en TEXT NOT NULL,
      discipline_ar TEXT NOT NULL,
      discipline_en TEXT NOT NULL,
      credits INTEGER NOT NULL DEFAULT 3,
      lecture_hours INTEGER NOT NULL DEFAULT 2,
      lab_hours INTEGER NOT NULL DEFAULT 2,
      tutorial_hours INTEGER NOT NULL DEFAULT 0,
      description_ar TEXT,
      description_en TEXT,
      objectives_ar TEXT,
      objectives_en TEXT,
      topics_ar TEXT,
      topics_en TEXT,
      is_elective INTEGER NOT NULL DEFAULT 0,
      is_shared_core INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS study_plan_semester_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      study_plan_id INTEGER NOT NULL REFERENCES study_plans(id),
      semester_id INTEGER NOT NULL REFERENCES semesters(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      requirement_type TEXT NOT NULL DEFAULT 'department_compulsory',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS course_prerequisites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id),
      prerequisite_course_id INTEGER NOT NULL REFERENCES courses(id),
      rule_type TEXT NOT NULL DEFAULT 'AND',
      min_grade_required TEXT DEFAULT 'D',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS library_references (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_ar TEXT NOT NULL,
      title_en TEXT NOT NULL,
      authors TEXT NOT NULL,
      publication_year INTEGER NOT NULL,
      publisher TEXT NOT NULL,
      discipline TEXT NOT NULL,
      resource_type TEXT NOT NULL DEFAULT 'book',
      doi TEXT,
      isbn TEXT,
      license TEXT NOT NULL DEFAULT 'Creative Commons CC-BY 4.0',
      access_type TEXT NOT NULL DEFAULT 'open_access',
      original_url TEXT NOT NULL,
      local_file_url TEXT,
      abstract_ar TEXT,
      abstract_en TEXT,
      is_verified INTEGER NOT NULL DEFAULT 1,
      is_demo_record INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      authority_ar TEXT NOT NULL,
      authority_en TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      title_en TEXT NOT NULL,
      type_ar TEXT NOT NULL,
      type_en TEXT NOT NULL,
      decree_number TEXT,
      issue_date TEXT,
      document_url TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'verified',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entity_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      source_id INTEGER NOT NULL REFERENCES sources(id),
      citation_note TEXT,
      verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'regular_user',
      institution_id INTEGER REFERENCES universities(id),
      avatar_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS document_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS uploaded_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      author_name TEXT,
      publication_year INTEGER,
      original_source TEXT,
      category_code TEXT NOT NULL DEFAULT 'course_summary',
      country_id INTEGER REFERENCES countries(id),
      university_id INTEGER REFERENCES universities(id),
      faculty_id INTEGER REFERENCES faculties(id),
      department_id INTEGER REFERENCES departments(id),
      program_id INTEGER REFERENCES academic_programs(id),
      course_id INTEGER REFERENCES courses(id),
      semester_number INTEGER,
      language TEXT NOT NULL DEFAULT 'ar',
      license_type TEXT NOT NULL DEFAULT 'Creative Commons CC-BY 4.0',
      copyright_declaration_accepted INTEGER NOT NULL DEFAULT 0,
      submitter_name TEXT NOT NULL,
      submitter_email TEXT NOT NULL,
      submitter_user_id INTEGER REFERENCES users(id),
      is_visitor_submission INTEGER NOT NULL DEFAULT 1,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/pdf',
      file_sha256 TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_review',
      screening_result TEXT DEFAULT 'passed_format_check',
      rejection_reason TEXT,
      approved_at TEXT,
      approved_by_user_id INTEGER REFERENCES users(id),
      download_count INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS document_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES uploaded_documents(id),
      reporter_name TEXT NOT NULL,
      reporter_email TEXT NOT NULL,
      reporter_user_id INTEGER REFERENCES users(id),
      reason TEXT NOT NULL,
      details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS document_review_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES uploaded_documents(id),
      reviewer_user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_saved_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verification_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      before_state TEXT,
      after_state TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reading_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      description TEXT,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reading_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reading_list_id INTEGER NOT NULL REFERENCES reading_lists(id),
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed baseline data only into a genuinely empty database.
  const countRow = sqlite.prepare('SELECT COUNT(*) as cnt FROM countries').get() as { cnt: number };
  if (countRow.cnt === 0 && !config.skipSeed) {
    seedInitialData();
  }

  applySchemaMigrations();
  runMigration0003();
  runMigration0004();
  runMigration0005();
}

function hasColumn(table: string, column: string): boolean {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function addColumnIfMissing(table: string, column: string, definition: string) {
  if (!hasColumn(table, column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/**
 * Additive schema migrations. Every new column has a default or is nullable, so
 * existing rows and existing academic records are preserved unchanged.
 */
function applySchemaMigrations() {
  const provenanceColumns: Array<[string, string]> = [
    ['source_url', 'TEXT'],
    ['source_institution', 'TEXT'],
    ['collected_at', 'TEXT'],
    ['verification_status', "TEXT NOT NULL DEFAULT 'unverified'"],
    ['last_verified_at', 'TEXT'],
    ['supporting_documentation_url', 'TEXT'],
    ['verification_notes', 'TEXT'],
  ];

  for (const table of ['faculties', 'departments', 'academic_programs', 'study_plans', 'courses']) {
    for (const [column, definition] of provenanceColumns) {
      addColumnIfMissing(table, column, definition);
    }
  }

  addColumnIfMissing('universities', 'collected_at', 'TEXT');
  addColumnIfMissing('universities', 'supporting_documentation_url', 'TEXT');

  for (const [column, definition] of [
    ['language', "TEXT NOT NULL DEFAULT 'ar'"],
    ['subject', 'TEXT'],
    ['copyright_info', 'TEXT'],
    ['availability', "TEXT NOT NULL DEFAULT 'link_only'"],
    ['download_allowed', 'INTEGER NOT NULL DEFAULT 0'],
    ['related_university_id', 'INTEGER REFERENCES universities(id)'],
    ['related_department_id', 'INTEGER REFERENCES departments(id)'],
    ['related_program_id', 'INTEGER REFERENCES academic_programs(id)'],
    ['related_course_id', 'INTEGER REFERENCES courses(id)'],
    ['source_institution', 'TEXT'],
    ['collected_at', 'TEXT'],
    ['verification_status', "TEXT NOT NULL DEFAULT 'unverified'"],
    ['last_verified_at', 'TEXT'],
    ['supporting_documentation_url', 'TEXT'],
    ['verification_notes', 'TEXT'],
  ] as Array<[string, string]>) {
    addColumnIfMissing('library_references', column, definition);
  }

  for (const [column, definition] of [
    ['screening_at', 'TEXT'],
    ['academic_review_at', 'TEXT'],
    ['published_at', 'TEXT'],
    ['quarantined_at', 'TEXT'],
    ['security_notes', 'TEXT'],
    ['download_allowed', 'INTEGER NOT NULL DEFAULT 1'],
  ] as Array<[string, string]>) {
    addColumnIfMissing('uploaded_documents', column, definition);
  }

  for (const [column, definition] of [
    ['resolved_at', 'TEXT'],
    ['resolved_by_user_id', 'INTEGER REFERENCES users(id)'],
    ['resolution_notes', 'TEXT'],
  ] as Array<[string, string]>) {
    addColumnIfMissing('document_reports', column, definition);
  }

  addColumnIfMissing('users', 'last_login_at', 'TEXT');
  addColumnIfMissing('sources', 'notes', 'TEXT');

  // The original table used a camelCase userId column while every other table
  // uses snake_case. Rename it in place so Drizzle and SQL agree; SQLite retains
  // all rows and the foreign key during RENAME COLUMN.
  if (hasColumn('user_saved_items', 'userId')) {
    sqlite.exec('ALTER TABLE user_saved_items RENAME COLUMN userId TO user_id');
  }

  const migrationId = '0002_provenance_workflow_and_trust';
  const alreadyApplied = sqlite
    .prepare('SELECT 1 FROM schema_migrations WHERE id = ?')
    .get(migrationId);
  if (alreadyApplied) return;

  const migrate = sqlite.transaction(() => {
    // Legacy seed records were inserted without primary supporting documents.
    // They are retained, but are explicitly marked unverified instead of being
    // presented as independently verified.
    sqlite.exec(`
      UPDATE universities
      SET general_verification_status = 'unverified',
          last_verified_at = NULL,
          verification_notes = COALESCE(verification_notes,
            'Legacy baseline record. No primary supporting document was supplied with the seed data; the record must be re-verified before being presented as verified.')
      WHERE id NOT IN (SELECT entity_id FROM entity_sources WHERE entity_type = 'university')
    `);

    sqlite.exec(`
      UPDATE academic_programs
      SET verification_status = 'unverified',
          verification_notes = COALESCE(verification_notes,
            'Legacy baseline record. No supporting accreditation document was supplied; treat accreditation details as unverified.')
    `);

    sqlite.exec(`
      UPDATE library_references
      SET is_verified = 0,
          verification_status = 'unverified',
          verification_notes = COALESCE(verification_notes,
            'Legacy reference without a supplied supporting document. Bibliographic details and DOI require verification.')
    `);

    // Remove the legacy shared default administrator password if it is still in
    // use. A random password is generated (or taken from the environment) and
    // written to a server-only file with 0600 permissions.
    const superAdmin = sqlite
      .prepare("SELECT id, email, password_hash FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1")
      .get() as { id: number; email: string; password_hash: string } | undefined;
    if (superAdmin && verifyPassword('Admin#MTA2026!Academic', superAdmin.password_hash)) {
      const newPassword =
        process.env.MTA_INITIAL_ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');
      sqlite
        .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(hashPassword(newPassword), superAdmin.id);
      const credentialsPath = path.join(DATA_DIR, 'initial-admin-credentials.txt');
      fs.writeFileSync(
        credentialsPath,
        `MTA University Library Collector - one-time administrator credentials\n` +
          `Email: ${superAdmin.email}\nPassword: ${newPassword}\n` +
          `Generated: ${new Date().toISOString()}\n` +
          `Delete this file after signing in and changing the password.\n`,
        { mode: 0o600 },
      );
      sqlite
        .prepare(
          `INSERT INTO verification_audit_logs (user_id, action, entity_type, entity_id, before_state, after_state, ip_address)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          superAdmin.id,
          'SECURITY_ROTATE_LEGACY_DEFAULT_PASSWORD',
          'user',
          superAdmin.id,
          JSON.stringify({ reason: 'legacy shared default password detected' }),
          JSON.stringify({ credentialsFile: 'data/initial-admin-credentials.txt' }),
          'migration',
        );
    }

    sqlite
      .prepare('INSERT INTO schema_migrations (id) VALUES (?)')
      .run(migrationId);
  });

  migrate();
}

function seedInitialData() {
  const insertCountry = sqlite.prepare(`
    INSERT INTO countries (code, name_ar, name_en, flag_emoji, is_starting_country)
    VALUES (?, ?, ?, ?, ?)
  `);
  const countryInfo = insertCountry.run('YE', 'الجمهورية اليمنية', 'Republic of Yemen', '🇾🇪', 1);
  const countryId = countryInfo.lastInsertRowid;

  // Bootstrap a single super administrator without shipping a hard-coded
  // password. The password comes from the environment, or is generated once and
  // written to a 0600 server-side file for the operator to collect.
  const initialAdminPassword =
    process.env.MTA_INITIAL_ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');
  const adminPasswordHash = hashPassword(initialAdminPassword);
  sqlite.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, is_active)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    process.env.MTA_ADMIN_EMAIL || 'admin@mta-tech.ye',
    adminPasswordHash,
    'MTA Super Administrator',
    'super_admin',
    1,
  );

  if (!process.env.MTA_INITIAL_ADMIN_PASSWORD) {
    const credentialsPath = path.join(DATA_DIR, 'initial-admin-credentials.txt');
    fs.writeFileSync(
      credentialsPath,
      `MTA University Library Collector - one-time administrator credentials\n` +
        `Email: ${process.env.MTA_ADMIN_EMAIL || 'admin@mta-tech.ye'}\nPassword: ${initialAdminPassword}\n` +
        `Generated: ${new Date().toISOString()}\n` +
        `Delete this file after signing in and changing the password.\n`,
      { mode: 0o600 },
    );
  }

  // Document Categories
  const insertCategory = sqlite.prepare(`
    INSERT INTO document_categories (code, name_ar, name_en, description)
    VALUES (?, ?, ?, ?)
  `);
  insertCategory.run('course_summary', 'ملخصات المقررات الدراسية', 'Course Summaries', 'ملخصات شاملة لمفردات المقررات الدراسية الجامعية');
  insertCategory.run('lecture_notes', 'محاضرات ومذكرات جامعية', 'Lecture Notes', 'سلايدات وملاحظات شرح أساتذة الجامعات');
  insertCategory.run('study_guide', 'مذكرات وملازم دراسية', 'Study Guides & Handouts', 'ملازم دراسية معتمدة لخدمة الطلاب');
  insertCategory.run('research_paper', 'أبحاث وأوراق علمية', 'Research Papers & Preprints', 'أوراق بحثية ومشاريع تخرج ذات قيمة علمية');
  insertCategory.run('open_book', 'كتب ومراجع أكاديمية مفتوحة', 'Open Educational Textbooks', 'كتب جامعية ومراجع مرخصة بتراخيص الوصول الحر');

  // Insert Official Baseline Sources
  const insertSource = sqlite.prepare(`
    INSERT INTO sources (authority_ar, authority_en, title_ar, title_en, type_ar, type_en, decree_number, issue_date, document_url, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const src1 = insertSource.run(
    'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education',
    'قانون الجامعات اليمنية رقم (17) لسنة 1995 وتعديلاته', 'Yemeni Universities Law No. 17 of 1995',
    'قانون جمهوري نافذ', 'Republican Law',
    'قانون رقم 17/1995', '1995-10-14',
    'https://yemen-nic.info/laws/higher-ed-17-1995', 'verified'
  ).lastInsertRowid;

  const src2 = insertSource.run(
    'مجلس الاعتماد الأكاديمي وضمان جودة التعليم العالي (CAQA)', 'Council for Accreditation & Quality Assurance (CAQA)',
    'دليل معايير الاعتماد البرامجي لبرامج الطب البشري (WFME)', 'Programmatic Accreditation Standards for Medicine (WFME Aligned)',
    'دليل معايير وطنية', 'National Standard',
    'قرار المجلس رقم 08/2022', '2022-03-20',
    'https://caqa-ye.org/standards/medicine-2022', 'verified'
  ).lastInsertRowid;

  const src3 = insertSource.run(
    'وزارة التعليم الفني والتدريب المهني', 'Ministry of Technical Education & Vocational Training',
    'القرار الجمهوري بإنشاء كليات المجتمع رقم (192) لسنة 2000', 'Republican Decree on Community Colleges No. 192/2000',
    'قرار جمهوري', 'Republican Decree',
    'قرار جمهوري 192/2000', '2000-09-02',
    'https://mtev.gov.ye/decrees/192-2000', 'verified'
  ).lastInsertRowid;

  // Insert Universities (Decoupled licensing & accreditation)
  const insertUniv = sqlite.prepare(`
    INSERT INTO universities (
      country_id, name_ar, name_en, name_short, sector, governorate_id, governorate_ar, governorate_en,
      established_year, website_url, email, phone, address,
      licensing_status, licensing_authority_ar, licensing_authority_en, licensing_decree_number, licensing_decree_date,
      accreditation_status, accreditation_authority_ar, accreditation_authority_en, accreditation_certificate_number, accreditation_date,
      general_verification_status, last_verified_at, faculties_count, programs_count, is_demo_record
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Sana'a University
  const u1 = insertUniv.run(
    countryId, 'جامعة صنعاء', "Sana'a University", 'SU', 'public', 'sanaa', 'أمانة العاصمة / صنعاء', "Sana'a",
    1970, 'https://su.edu.ye', 'info@su.edu.ye', '+967-1-464400', 'صنعاء - مذبح',
    'officially_licensed', 'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education', 'قانون رقم 24 لسنة 1970', '1970-11-20',
    'institutionally_accredited', 'مجلس الاعتماد الأكاديمي وضمان جودة التعليم العالي (CAQA)', 'Council for Accreditation and Quality Assurance (CAQA)', 'CAQA-INST-2023-01', '2023-05-15',
    'verified_complete', '2026-11-08', 22, 140, 0
  ).lastInsertRowid;

  // 2. University of Aden
  const u2 = insertUniv.run(
    countryId, 'جامعة عدن', 'University of Aden', 'UoA', 'public', 'aden', 'عدن', 'Aden',
    1975, 'https://aden-univ.net', 'info@aden-univ.net', '+967-2-234400', 'عدن - خور مكسر',
    'officially_licensed', 'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education', 'قانون رقم 22 لسنة 1975', '1975-09-10',
    'accreditation_under_verification', 'مجلس الاعتماد الأكاديمي وضمان الجودة (CAQA)', 'Council for Accreditation and Quality Assurance (CAQA)', 'CAQA-REVIEW-2024-09', '2024-02-10',
    'partially_verified', '2026-11-08', 16, 95, 0
  ).lastInsertRowid;

  // 3. Taiz University
  const u3 = insertUniv.run(
    countryId, 'جامعة تعز', 'Taiz University', 'TU', 'public', 'taiz', 'تعز', 'Taiz',
    1993, 'https://taiz.edu.ye', 'info@taiz.edu.ye', '+967-4-211400', 'تعز - حبيل سلمان',
    'officially_licensed', 'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education', 'قرار جمهوري رقم 10 لسنة 1993', '1993-04-19',
    'accreditation_under_verification', 'مجلس الاعتماد الأكاديمي وضمان الجودة', 'CAQA', 'CAQA-REVIEW-2024-12', '2024-04-12',
    'partially_verified', '2026-11-08', 12, 78, 0
  ).lastInsertRowid;

  // 4. Hadhramout University
  const u4 = insertUniv.run(
    countryId, 'جامعة حضرموت', 'Hadhramout University', 'HU', 'public', 'hadhramaut', 'حضرموت (المكلا)', 'Hadhramaut (Mukalla)',
    1993, 'https://hu.edu.ye', 'info@hu.edu.ye', '+967-5-360800', 'المكلا - فلك',
    'officially_licensed', 'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education', 'قرار جمهوري رقم 45 لسنة 1993', '1993-07-28',
    'institutionally_accredited', 'مجلس الاعتماد الأكاديمي وضمان الجودة (CAQA)', 'CAQA', 'CAQA-INST-2024-04', '2024-01-18',
    'verified_complete', '2026-11-08', 15, 82, 0
  ).lastInsertRowid;

  // 5. University of Science and Technology
  const u5 = insertUniv.run(
    countryId, 'جامعة العلوم والتكنولوجيا', 'University of Science and Technology', 'UST', 'private', 'sanaa', 'صنعاء / عدن', "Sana'a / Aden",
    1994, 'https://ust.edu.ye', 'info@ust.edu.ye', '+967-1-373237', 'صنعاء - الستين الغربي',
    'officially_licensed', 'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education', 'قرار وزاري رقم 2 لسنة 1994', '1994-03-01',
    'institutionally_accredited', 'مجلس الاعتماد الأكاديمي وضمان جودة التعليم العالي (CAQA)', 'CAQA', 'CAQA-INST-2022-02', '2022-11-05',
    'verified_complete', '2026-11-08', 9, 65, 0
  ).lastInsertRowid;

  // 6. Sana'a Community College
  const u6 = insertUniv.run(
    countryId, 'كلية المجتمع صنعاء', "Sana'a Community College", 'SCC', 'community_college', 'sanaa', 'صنعاء', "Sana'a",
    2000, 'https://scc.edu.ye', 'info@scc.edu.ye', '+967-1-512000', 'صنعاء - صرف',
    'officially_licensed', 'وزارة التعليم الفني والتدريب المهني', 'Ministry of Technical Education', 'قرار جمهوري رقم 192 لسنة 2000', '2000-09-02',
    'not_documented', 'مجلس الاعتماد الأكاديمي وضمان الجودة', 'CAQA', null, null,
    'partially_verified', '2026-11-08', 4, 18, 0
  ).lastInsertRowid;

  // 7. Aden Community College
  const u7 = insertUniv.run(
    countryId, 'كلية المجتمع عدن', 'Aden Community College', 'ACC', 'community_college', 'aden', 'عدن', 'Aden',
    2000, 'https://acc-ye.com', 'info@acc-ye.com', '+967-2-381000', 'عدن - دار سعد',
    'officially_licensed', 'وزارة التعليم الفني والتدريب المهني', 'Ministry of Technical Education', 'قرار جمهوري رقم 193 لسنة 2000', '2000-09-02',
    'not_documented', 'مجلس الاعتماد الأكاديمي', 'CAQA', null, null,
    'partially_verified', '2026-11-08', 3, 14, 0
  ).lastInsertRowid;

  // 8. Ibb University
  const u8 = insertUniv.run(
    countryId, 'جامعة إب', 'Ibb University', 'IU', 'public', 'ibb', 'إب', 'Ibb',
    1996, 'https://ibbuniv.edu.ye', 'info@ibbuniv.edu.ye', '+967-4-405000', 'إب - الدائري الغربي',
    'officially_licensed', 'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education', 'قرار جمهوري رقم 123 لسنة 1996', '1996-08-20',
    'accreditation_under_verification', 'مجلس الاعتماد الأكاديمي وضمان الجودة', 'CAQA', 'CAQA-REVIEW-2024-11', '2024-05-10',
    'partially_verified', '2026-11-08', 11, 64, 0
  ).lastInsertRowid;

  // 9. Thamar University
  const u9 = insertUniv.run(
    countryId, 'جامعة ذمار', 'Thamar University', 'TU-YE', 'public', 'thamar', 'ذمار', 'Thamar',
    1996, 'https://tu.edu.ye', 'info@tu.edu.ye', '+967-6-508000', 'ذمار - طريق صنعاء',
    'officially_licensed', 'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education', 'قرار جمهوري رقم 215 لسنة 1996', '1996-10-15',
    'partially_verified', 'مجلس الاعتماد الأكاديمي', 'CAQA', null, null,
    'partially_verified', '2026-11-08', 10, 58, 0
  ).lastInsertRowid;

  // 10. Al-Ahgaff University
  const u10 = insertUniv.run(
    countryId, 'جامعة الأحقاف', 'Al-Ahgaff University', 'AU', 'private', 'hadhramaut', 'حضرموت (المكلا)', 'Hadhramaut (Mukalla)',
    1995, 'https://ahgaff.edu', 'info@ahgaff.edu', '+967-5-303000', 'المكلا - فوه',
    'officially_licensed', 'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education', 'ترخيص وزاري صادر 1995', '1995-04-12',
    'partially_verified', 'مجلس الاعتماد الأكاديمي', 'CAQA', null, null,
    'partially_verified', '2026-11-08', 6, 28, 0
  ).lastInsertRowid;

  // 11. Lebanese International University
  const u11 = insertUniv.run(
    countryId, 'الجامعة اللبنانية الدولية في اليمن', 'Lebanese International University Yemen', 'LIU', 'private', 'sanaa', 'صنعاء / تعز / عدن', "Sana'a / Taiz / Aden",
    2006, 'https://liu.edu.ye', 'info@liu.edu.ye', '+967-1-432000', 'صنعاء - بيت بوس',
    'officially_licensed', 'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education', 'ترخيص وزاري صادر 2006', '2006-06-18',
    'accreditation_under_verification', 'مجلس الاعتماد الأكاديمي', 'CAQA', null, null,
    'partially_verified', '2026-11-08', 5, 32, 0
  ).lastInsertRowid;

  // 12. Al-Janad University for Science & Technology
  const u12 = insertUniv.run(
    countryId, 'جامعة الجند للعلوم والتكنولوجيا', 'Al-Janad University for Science & Technology', 'JUST', 'private', 'taiz', 'تعز', 'Taiz',
    2018, 'https://just.edu.ye', 'info@just.edu.ye', '+967-4-282000', 'تعز - شارع جمال',
    'officially_licensed', 'وزارة التعليم العالي والبحث العلمي', 'Ministry of Higher Education', 'قرار وزاري رقم 12 لسنة 2018', '2018-05-14',
    'candidate_status', 'مجلس الاعتماد الأكاديمي وضمان الجودة', 'CAQA', 'CAQA-CAND-2023-08', '2023-08-22',
    'partially_verified', '2026-11-08', 4, 22, 0
  ).lastInsertRowid;

  // Link Entities with Official Sources
  sqlite.prepare(`
    INSERT INTO entity_sources (entity_type, entity_id, source_id, citation_note)
    VALUES (?, ?, ?, ?)
  `).run('university', u1, src1, 'تأسست جامعة صنعاء بموجب القانون رقم 24 لسنة 1970');

  // Insert Faculties & Departments for Sana'a University
  const fMed = sqlite.prepare(`
    INSERT INTO faculties (university_id, name_ar, name_en, established_year)
    VALUES (?, ?, ?, ?)
  `).run(u1, 'كلية الطب والعلوم الصحية', 'Faculty of Medicine & Health Sciences', 1983).lastInsertRowid;

  const fComp = sqlite.prepare(`
    INSERT INTO faculties (university_id, name_ar, name_en, established_year)
    VALUES (?, ?, ?, ?)
  `).run(u1, 'كلية الحاسوب وتكنولوجيا المعلومات', 'Faculty of Computer & Information Technology', 2008).lastInsertRowid;

  const dMed = sqlite.prepare(`
    INSERT INTO departments (faculty_id, name_ar, name_en)
    VALUES (?, ?, ?)
  `).run(fMed, 'قسم الطب والجراحة العامة', 'Department of Medicine & Surgery').lastInsertRowid;

  const dCS = sqlite.prepare(`
    INSERT INTO departments (faculty_id, name_ar, name_en)
    VALUES (?, ?, ?)
  `).run(fComp, 'قسم علوم الحاسوب والذكاء الاصطناعي', 'Department of Computer Science & AI').lastInsertRowid;

  // Insert Academic Programs
  const pMed = sqlite.prepare(`
    INSERT INTO academic_programs (
      department_id, faculty_id, university_id, name_ar, name_en, degree_level, duration_years, total_credits,
      programmatic_accreditation, programmatic_authority_ar, programmatic_authority_en, is_demo_record
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dMed, fMed, u1, 'دكتور في الطب البشري والجراحة (MD)', 'Doctor of Medicine and Surgery (MD)', 'Bachelor', 6, 248,
    'programmatically_accredited', 'مجلس الاعتماد الأكاديمي وضمان الجودة (CAQA) معتمد دولياً من WFME', 'CAQA WFME Recognized', 0
  ).lastInsertRowid;

  const pCS = sqlite.prepare(`
    INSERT INTO academic_programs (
      department_id, faculty_id, university_id, name_ar, name_en, degree_level, duration_years, total_credits,
      programmatic_accreditation, programmatic_authority_ar, programmatic_authority_en, is_demo_record
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dCS, fComp, u1, 'بكالوريوس علوم الحاسوب', 'Bachelor of Computer Science', 'Bachelor', 4, 136,
    'programmatically_accredited', 'مجلس الاعتماد الأكاديمي وضمان الجودة (CAQA)', 'CAQA Programmatic Accreditation', 0
  ).lastInsertRowid;

  // Insert Study Plans
  const spMed2024 = sqlite.prepare(`
    INSERT INTO study_plans (program_id, version_year, version_name_ar, version_name_en, is_active, total_credits, total_semesters, approved_date, approval_decree)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(pMed, '2024', 'الخطة الدراسية المطورة 2024 (نظام الوحدات التكاملية)', 'Modernized Integrated Curriculum 2024', 1, 248, 12, '2024-01-15', 'قرار مجلس الجامعة رقم 4 لسنة 2024').lastInsertRowid;

  const spCS2024 = sqlite.prepare(`
    INSERT INTO study_plans (program_id, version_year, version_name_ar, version_name_en, is_active, total_credits, total_semesters, approved_date, approval_decree)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(pCS, '2024', 'الخطة الدراسية المطورة لعلوم الحاسوب 2024', 'Modernized Computer Science Curriculum 2024', 1, 136, 8, '2024-02-10', 'قرار مجلس الكلية رقم 12 لسنة 2024').lastInsertRowid;

  // Insert Semesters for Medicine
  const semMed1 = sqlite.prepare(`
    INSERT INTO semesters (study_plan_id, semester_number, academic_year_number, name_ar, name_en, min_credits, max_credits)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(spMed2024, 1, 1, 'الفصل الدراسي الأول - السنة الأولى', 'Semester 1 - First Academic Year', 15, 21).lastInsertRowid;

  const semMed2 = sqlite.prepare(`
    INSERT INTO semesters (study_plan_id, semester_number, academic_year_number, name_ar, name_en, min_credits, max_credits)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(spMed2024, 2, 1, 'الفصل الدراسي الثاني - السنة الأولى', 'Semester 2 - First Academic Year', 15, 21).lastInsertRowid;

  // Insert Semesters for Computer Science
  const semCS1 = sqlite.prepare(`
    INSERT INTO semesters (study_plan_id, semester_number, academic_year_number, name_ar, name_en, min_credits, max_credits)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(spCS2024, 1, 1, 'الفصل الدراسي الأول - السنة الأولى', 'Semester 1 - First Academic Year', 12, 18).lastInsertRowid;

  const semCS2 = sqlite.prepare(`
    INSERT INTO semesters (study_plan_id, semester_number, academic_year_number, name_ar, name_en, min_credits, max_credits)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(spCS2024, 2, 1, 'الفصل الدراسي الثاني - السنة الأولى', 'Semester 2 - First Academic Year', 12, 18).lastInsertRowid;

  // Insert Reusable Courses
  const insertCourse = sqlite.prepare(`
    INSERT INTO courses (
      code, title_ar, title_en, discipline_ar, discipline_en, credits, lecture_hours, lab_hours, tutorial_hours,
      description_ar, description_en, objectives_ar, objectives_en, topics_ar, topics_en, is_elective, is_shared_core
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const cCS101 = insertCourse.run(
    'CS101', 'مقدمة في البرمجة وتراكيب البيانات', 'Introduction to Programming & Data Structures',
    'علوم الحاسوب ونظم المعلومات', 'Computer Science', 3, 2, 2, 0,
    'المفاهيم الأساسية للخوارزميات، البرمجة الكائنية، وتراكيب البيانات الخطية.',
    'Fundamental algorithms, object-oriented paradigms, and linear data structures.',
    JSON.stringify(['إتقان كتابة الكود النظيف', 'فهم التعقيد الحسابي Big-O', 'بناء تراكيب البيانات']),
    JSON.stringify(['Clean code mastery', 'Algorithmic Big-O analysis', 'Building dynamic data structures']),
    JSON.stringify(['الأسبوع 1: بيئة التطوير والأساسيات', 'الأسبوع 2-5: الدوال والأصناف', 'الأسبوع 6-10: القوائم والأكوام والصفوف', 'الأسبوع 11-14: الأشجار والفرز']),
    JSON.stringify(['Week 1: Setup', 'Weeks 2-5: Functions & Classes', 'Weeks 6-10: Stacks & Queues', 'Weeks 11-14: Trees & Sorting']),
    0, 1
  ).lastInsertRowid;

  const cCS102 = insertCourse.run(
    'CS102', 'تراكيب البيانات والخوارزميات المتقدمة', 'Advanced Data Structures & Algorithms',
    'علوم الحاسوب ونظم المعلومات', 'Computer Science', 3, 2, 2, 0,
    'دراسة متعمقة لخوارزميات الرسوم البيانية، البرمجة الديناميكية، وهياكل الأشجار المتوازنة.',
    'In-depth graph algorithms, dynamic programming, and balanced search trees.',
    JSON.stringify(['تحليل الخوارزميات المتقدمة', 'خوارزميات المسار الأقصر والتدفق']),
    JSON.stringify(['Advanced algorithm design', 'Shortest path & network flows']),
    JSON.stringify(['الأسبوع 1-4: الرسوم البيانية Graph Traversal', 'الأسبوع 5-8: الأشجار المتوازنة AVL & Red-Black', 'الأسبوع 9-14: البرمجة الديناميكية']),
    JSON.stringify(['Weeks 1-4: Graphs', 'Weeks 5-8: Balanced Trees', 'Weeks 9-14: Dynamic Programming']),
    0, 1
  ).lastInsertRowid;

  const cCS204 = insertCourse.run(
    'CS204', 'أسس الذكاء الاصطناعي والتعلم الآلي', 'Foundations of Artificial Intelligence & Machine Learning',
    'الذكاء الاصطناعي وعلوم البيانات', 'Artificial Intelligence', 4, 3, 2, 0,
    'دراسة استراتيجيات البحث الذكي، الشبكات العصبية، وخوارزميات التعلم الآلي.',
    'Heuristic search, neural networks, supervised and unsupervised learning.',
    JSON.stringify(['فهم نماذج التعلم الآلي والانحدار والتصنيف', 'بناء شبكات عصبية أولية']),
    JSON.stringify(['Machine learning classification and regression', 'Neural networks training']),
    JSON.stringify(['الأسبوع 1-3: البحث الاستدلالي', 'الأسبوع 4-8: خوارزميات التصنيف والانحدار', 'الأسبوع 9-14: الشبكات العصبية العميقة']),
    JSON.stringify(['Weeks 1-3: Heuristic Search', 'Weeks 4-8: Supervised ML', 'Weeks 9-14: Deep Neural Networks']),
    0, 0
  ).lastInsertRowid;

  const cMED101 = insertCourse.run(
    'MED101', 'علم التشريح البشري العام (1)', 'General Human Anatomy I',
    'الطب البشري والعلوم الصحية', 'Medicine & Health Sciences', 4, 3, 2, 0,
    'تشريح الأطراف العلوية والسفلية وجدار الصدر مع التركيز على العلاقات المكانية للأعصاب والأوعية الدموية.',
    'Gross anatomy of upper and lower extremities and thorax.',
    JSON.stringify(['تحديد المواقع التشريحية الدقيقة للعظام والأعصاب والشرايين', 'التطبيق في التشخيص السريري']),
    JSON.stringify(['Identify anatomical landmarks and neurovascular bundles', 'Clinical topographical applications']),
    JSON.stringify(['الأسبوع 1-4: الطرف العلوي والمفاصل', 'الأسبوع 5-8: الطرف السفلي والتغذية الدموية', 'الأسبوع 9-14: جدار الصدر والقلب والرئتين']),
    JSON.stringify(['Weeks 1-4: Upper Limb', 'Weeks 5-8: Lower Limb', 'Weeks 9-14: Thorax']),
    0, 0
  ).lastInsertRowid;

  const cMED102 = insertCourse.run(
    'MED102', 'علم وظائف الأعضاء الفسيولوجيا (1)', 'Medical Physiology I',
    'الطب البشري والعلوم الصحية', 'Medicine & Health Sciences', 4, 3, 2, 0,
    'دراسة الوظائف الحيوية لخلايا الجسم، الجهاز العصبي المركزي، وجهاز الدوران والقلب.',
    'Cellular physiology, neurophysiology, and cardiovascular hemodynamics.',
    JSON.stringify(['فهم آليات النقل الخلوي وجهد الفعل العصبي', 'الفيزيولوجيا الحيوية للجهاز القلبي الوعائي']),
    JSON.stringify(['Understand membrane transport and action potentials', 'Cardiovascular physiology']),
    JSON.stringify(['الأسبوع 1-4: فيزيولوجيا الخلية والأغشية', 'الأسبوع 5-9: الجهاز العصبي الحسي والحركي', 'الأسبوع 10-14: فيزيولوجيا القلب والدورة الدموية']),
    JSON.stringify(['Weeks 1-4: Cellular Physiology', 'Weeks 5-9: Neurophysiology', 'Weeks 10-14: Cardiovascular System']),
    0, 0
  ).lastInsertRowid;

  // Insert Course Prerequisites (Valid Acyclic Dependencies)
  // CS102 requires CS101
  sqlite.prepare(`
    INSERT INTO course_prerequisites (course_id, prerequisite_course_id, rule_type, min_grade_required)
    VALUES (?, ?, ?, ?)
  `).run(cCS102, cCS101, 'AND', 'C');

  // CS204 requires CS102
  sqlite.prepare(`
    INSERT INTO course_prerequisites (course_id, prerequisite_course_id, rule_type, min_grade_required)
    VALUES (?, ?, ?, ?)
  `).run(cCS204, cCS102, 'AND', 'C');

  // Associate Courses to Study Plans & Semesters
  const insertPlanCourse = sqlite.prepare(`
    INSERT INTO study_plan_semester_courses (study_plan_id, semester_id, course_id, requirement_type)
    VALUES (?, ?, ?, ?)
  `);
  insertPlanCourse.run(spCS2024, semCS1, cCS101, 'department_compulsory');
  insertPlanCourse.run(spCS2024, semCS2, cCS102, 'department_compulsory');
  insertPlanCourse.run(spMed2024, semMed1, cMED101, 'department_compulsory');
  insertPlanCourse.run(spMed2024, semMed1, cMED102, 'department_compulsory');

  // Insert Library References
  const insertRef = sqlite.prepare(`
    INSERT INTO library_references (
      title_ar, title_en, authors, publication_year, publisher, discipline, resource_type,
      doi, isbn, license, access_type, original_url, abstract_ar, abstract_en, is_verified, is_demo_record
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRef.run(
    'مبادئ الذكاء الاصطناعي وتطبيقاته في الرعاية الصحية',
    'Principles of Artificial Intelligence and Applications in Healthcare',
    'د. خالد العمري، د. سارة باعباد', 2024, 'دار النشر الأكاديمية / Open Access Repository',
    'الذكاء الاصطناعي وعلوم البيانات', 'book',
    '10.1016/j.aihealth.2024.08.012', '978-99921-82-45-1', 'Creative Commons CC-BY 4.0', 'open_access',
    'https://doi.org/10.1016/j.aihealth.2024.08.012',
    'دراسة شاملة لتقنيات النمذجة التنبؤية وشبكات التعلم العميق في التشخيص الطبي والأشعة الرقمية.',
    'Comprehensive examination of predictive modeling and deep neural networks in medical diagnostics.',
    1, 0
  );

  insertRef.run(
    'دراسة تحليلية للمحددات الاقتصادية لنمو القطاع المصرفي في اليمن',
    'An Empirical Study of Economic Determinants in Yemeni Banking Sector',
    'د. طارق الحكيمي', 2023, 'المجلة اليمنية للبحوث الاقتصادية / DOAJ Indexed',
    'الاقتصاد والعلوم المالية', 'research_paper',
    '10.2139/ssrn.4398102', null, 'Open Access Journal License', 'open_access',
    'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4398102',
    'تحليل قياسي لأثر السياسات النقدية وسعر الصرف على استقرار المصارف التجارية وتسهيلات الائتمان الاستثماري.',
    'Econometric analysis of monetary policies and foreign exchange rates on commercial banking stability in Yemen.',
    1, 0
  );

  insertRef.run(
    'تراكيب البيانات والخوارزميات بلغة بايثون وسي بلس بلس',
    'Data Structures and Algorithms in Python and C++',
    'م. ياسين الشوافي', 2022, 'مبادرة المصادر التعليمية المفتوحة (OER)',
    'علوم الحاسوب ونظم المعلومات', 'oer',
    '10.5281/zenodo.7214980', '978-0-9941-23-4', 'GNU Free Documentation License', 'free_download',
    'https://zenodo.org/record/7214980',
    'مرجع تعليمي تطبيقي مجاني بالكامل يغطي الخوارزميات المتقدمة، التعقيد الحسابي، ومئات المسائل العملية المحلولة للطلاب والباحثين.',
    'A fully open practical textbook covering advanced algorithms, computational complexity, and problem sets.',
    1, 0
  );
}

// Automatically ensure tables exist on module load
initializeDatabase();
