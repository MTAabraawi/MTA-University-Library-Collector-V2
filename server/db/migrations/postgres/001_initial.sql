-- MTA University Library Collector — PostgreSQL initial schema
-- Mirrors the SQLite schema used in development, with PostgreSQL-native types.
-- Apply with: psql "$DATABASE_URL" -f server/db/migrations/postgres/001_initial.sql
--
-- IMPORTANT: This migration has NOT been executed against a live PostgreSQL
-- instance in this environment. It is provided for production provisioning and
-- must be validated in staging before use. It is additive and idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  flag_emoji VARCHAR(16) NOT NULL DEFAULT '🇾🇪',
  is_starting_country BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS universities (
  id SERIAL PRIMARY KEY,
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
  source_institution TEXT,
  collected_at TIMESTAMPTZ,
  supporting_documentation_url TEXT,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  faculties_count INTEGER NOT NULL DEFAULT 0,
  programs_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campuses (
  id SERIAL PRIMARY KEY,
  university_id INTEGER NOT NULL REFERENCES universities(id),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  governorate_ar TEXT NOT NULL,
  governorate_en TEXT NOT NULL,
  city TEXT,
  address TEXT,
  is_main_campus BOOLEAN NOT NULL DEFAULT FALSE,
  established_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faculties (
  id SERIAL PRIMARY KEY,
  university_id INTEGER NOT NULL REFERENCES universities(id),
  campus_id INTEGER REFERENCES campuses(id),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  dean_name TEXT,
  established_year INTEGER,
  source_url TEXT,
  source_institution TEXT,
  collected_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  last_verified_at TEXT,
  supporting_documentation_url TEXT,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES faculties(id),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  head_of_department TEXT,
  source_url TEXT,
  source_institution TEXT,
  collected_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  last_verified_at TEXT,
  supporting_documentation_url TEXT,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academic_programs (
  id SERIAL PRIMARY KEY,
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
  source_url TEXT,
  source_institution TEXT,
  collected_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  last_verified_at TEXT,
  supporting_documentation_url TEXT,
  verification_notes TEXT,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_plans (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES academic_programs(id),
  version_year TEXT NOT NULL,
  version_name_ar TEXT NOT NULL,
  version_name_en TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  total_credits INTEGER NOT NULL,
  total_semesters INTEGER NOT NULL,
  approved_date TEXT,
  approval_decree TEXT,
  source_url TEXT,
  source_institution TEXT,
  collected_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  last_verified_at TEXT,
  supporting_documentation_url TEXT,
  verification_notes TEXT,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS semesters (
  id SERIAL PRIMARY KEY,
  study_plan_id INTEGER NOT NULL REFERENCES study_plans(id),
  semester_number INTEGER NOT NULL,
  academic_year_number INTEGER NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  min_credits INTEGER NOT NULL DEFAULT 12,
  max_credits INTEGER NOT NULL DEFAULT 21,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
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
  is_elective BOOLEAN NOT NULL DEFAULT FALSE,
  is_shared_core BOOLEAN NOT NULL DEFAULT FALSE,
  source_url TEXT,
  source_institution TEXT,
  collected_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  last_verified_at TEXT,
  supporting_documentation_url TEXT,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_plan_semester_courses (
  id SERIAL PRIMARY KEY,
  study_plan_id INTEGER NOT NULL REFERENCES study_plans(id),
  semester_id INTEGER NOT NULL REFERENCES semesters(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  requirement_type TEXT NOT NULL DEFAULT 'department_compulsory',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_prerequisites (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  prerequisite_course_id INTEGER NOT NULL REFERENCES courses(id),
  rule_type TEXT NOT NULL DEFAULT 'AND',
  min_grade_required TEXT DEFAULT 'D',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT course_prerequisites_unique_pair UNIQUE (course_id, prerequisite_course_id)
);

CREATE TABLE IF NOT EXISTS library_references (
  id SERIAL PRIMARY KEY,
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
  language TEXT NOT NULL DEFAULT 'ar',
  subject TEXT,
  copyright_info TEXT,
  availability TEXT NOT NULL DEFAULT 'link_only',
  download_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  related_university_id INTEGER REFERENCES universities(id),
  related_department_id INTEGER REFERENCES departments(id),
  related_program_id INTEGER REFERENCES academic_programs(id),
  related_course_id INTEGER REFERENCES courses(id),
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  source_institution TEXT,
  collected_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  last_verified_at TEXT,
  supporting_documentation_url TEXT,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
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
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entity_sources (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  source_id INTEGER NOT NULL REFERENCES sources(id),
  citation_note TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'regular_user',
  institution_id INTEGER REFERENCES universities(id),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_categories (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS uploaded_documents (
  id SERIAL PRIMARY KEY,
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
  copyright_declaration_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_user_id INTEGER REFERENCES users(id),
  is_visitor_submission BOOLEAN NOT NULL DEFAULT TRUE,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_sha256 VARCHAR(64) NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  screening_result TEXT DEFAULT 'passed_format_check',
  rejection_reason TEXT,
  screening_at TEXT,
  academic_review_at TEXT,
  approved_at TEXT,
  published_at TEXT,
  quarantined_at TEXT,
  security_notes TEXT,
  download_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by_user_id INTEGER REFERENCES users(id),
  download_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_reports (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES uploaded_documents(id),
  reporter_name TEXT NOT NULL,
  reporter_email TEXT NOT NULL,
  reporter_user_id INTEGER REFERENCES users(id),
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TEXT,
  resolved_by_user_id INTEGER REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_review_actions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES uploaded_documents(id),
  reviewer_user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_saved_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_saved_items_unique UNIQUE (user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS verification_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  before_state TEXT,
  after_state TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reading_lists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reading_list_items (
  id SERIAL PRIMARY KEY,
  reading_list_id INTEGER NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_universities_country ON universities(country_id);
CREATE INDEX IF NOT EXISTS idx_universities_governorate ON universities(governorate_id);
CREATE INDEX IF NOT EXISTS idx_faculties_university ON faculties(university_id);
CREATE INDEX IF NOT EXISTS idx_departments_faculty ON departments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_programs_university ON academic_programs(university_id);
CREATE INDEX IF NOT EXISTS idx_programs_department ON academic_programs(department_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_program ON study_plans(program_id);
CREATE INDEX IF NOT EXISTS idx_semesters_plan ON semesters(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_spc_plan ON study_plan_semester_courses(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_spc_semester ON study_plan_semester_courses(semester_id);
CREATE INDEX IF NOT EXISTS idx_prereq_course ON course_prerequisites(course_id);
CREATE INDEX IF NOT EXISTS idx_library_type ON library_references(resource_type);
CREATE INDEX IF NOT EXISTS idx_library_discipline ON library_references(discipline);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_documents_status ON uploaded_documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_university ON uploaded_documents(university_id);
CREATE INDEX IF NOT EXISTS idx_documents_course ON uploaded_documents(course_id);
CREATE INDEX IF NOT EXISTS idx_documents_sha ON uploaded_documents(file_sha256);
CREATE INDEX IF NOT EXISTS idx_reports_document ON document_reports(document_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON document_reports(status);
CREATE INDEX IF NOT EXISTS idx_review_actions_document ON document_review_actions(document_id);
CREATE INDEX IF NOT EXISTS idx_saved_user ON user_saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON verification_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reading_lists_user ON reading_lists(user_id);

INSERT INTO schema_migrations (id) VALUES ('001_initial') ON CONFLICT (id) DO NOTHING;

COMMIT;
