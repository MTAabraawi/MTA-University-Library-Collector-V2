/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pgTable, text, integer, boolean, timestamp, serial, varchar } from 'drizzle-orm/pg-core';

// PostgreSQL Schema Parity for Production Deployment
export const pgCountries = pgTable('countries', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 8 }).notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  flagEmoji: varchar('flag_emoji', { length: 16 }).notNull().default('🇾🇪'),
  isStartingCountry: boolean('is_starting_country').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgUniversities = pgTable('universities', {
  id: serial('id').primaryKey(),
  countryId: integer('country_id').notNull().references(() => pgCountries.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  nameShort: text('name_short'),
  sector: text('sector').notNull().default('public'),
  governorateId: text('governorate_id').notNull(),
  governorateAr: text('governorate_ar').notNull(),
  governorateEn: text('governorate_en').notNull(),
  establishedYear: integer('established_year').notNull(),
  websiteUrl: text('website_url'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  logoUrl: text('logo_url'),
  licensingStatus: text('licensing_status').notNull().default('license_under_verification'),
  licensingAuthorityAr: text('licensing_authority_ar'),
  licensingAuthorityEn: text('licensing_authority_en'),
  licensingDecreeNumber: text('licensing_decree_number'),
  licensingDecreeDate: text('licensing_decree_date'),
  accreditationStatus: text('accreditation_status').notNull().default('accreditation_under_verification'),
  accreditationAuthorityAr: text('accreditation_authority_ar'),
  accreditationAuthorityEn: text('accreditation_authority_en'),
  accreditationCertificateNumber: text('accreditation_certificate_number'),
  accreditationDate: text('accreditation_date'),
  generalVerificationStatus: text('general_verification_status').notNull().default('under_verification'),
  lastVerifiedAt: text('last_verified_at'),
  verificationNotes: text('verification_notes'),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: timestamp('collected_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  isDemoRecord: boolean('is_demo_record').notNull().default(false),
  facultiesCount: integer('faculties_count').notNull().default(0),
  programsCount: integer('programs_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pgCampuses = pgTable('campuses', {
  id: serial('id').primaryKey(),
  universityId: integer('university_id').notNull().references(() => pgUniversities.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  governorateAr: text('governorate_ar').notNull(),
  governorateEn: text('governorate_en').notNull(),
  city: text('city'),
  address: text('address'),
  isMainCampus: boolean('is_main_campus').notNull().default(false),
  establishedYear: integer('established_year'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgFaculties = pgTable('faculties', {
  id: serial('id').primaryKey(),
  universityId: integer('university_id').notNull().references(() => pgUniversities.id),
  campusId: integer('campus_id').references(() => pgCampuses.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  deanName: text('dean_name'),
  establishedYear: integer('established_year'),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: timestamp('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgDepartments = pgTable('departments', {
  id: serial('id').primaryKey(),
  facultyId: integer('faculty_id').notNull().references(() => pgFaculties.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  headOfDepartment: text('head_of_department'),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: timestamp('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgAcademicPrograms = pgTable('academic_programs', {
  id: serial('id').primaryKey(),
  departmentId: integer('department_id').notNull().references(() => pgDepartments.id),
  facultyId: integer('faculty_id').notNull().references(() => pgFaculties.id),
  universityId: integer('university_id').notNull().references(() => pgUniversities.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  degreeLevel: text('degree_level').notNull().default('Bachelor'),
  studyType: text('study_type').notNull().default('Regular'),
  durationYears: integer('duration_years').notNull().default(4),
  totalCredits: integer('total_credits').notNull().default(132),
  programmaticAccreditation: text('programmatic_accreditation').notNull().default('accreditation_under_verification'),
  programmaticAuthorityAr: text('programmatic_authority_ar'),
  programmaticAuthorityEn: text('programmatic_authority_en'),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: timestamp('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  isDemoRecord: boolean('is_demo_record').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgStudyPlans = pgTable('study_plans', {
  id: serial('id').primaryKey(),
  programId: integer('program_id').notNull().references(() => pgAcademicPrograms.id),
  versionYear: varchar('version_year', { length: 16 }).notNull(),
  versionNameAr: text('version_name_ar').notNull(),
  versionNameEn: text('version_name_en').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  totalCredits: integer('total_credits').notNull(),
  totalSemesters: integer('total_semesters').notNull(),
  approvedDate: text('approved_date'),
  approvalDecree: text('approval_decree'),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: timestamp('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  isDemoRecord: boolean('is_demo_record').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgSemesters = pgTable('semesters', {
  id: serial('id').primaryKey(),
  studyPlanId: integer('study_plan_id').notNull().references(() => pgStudyPlans.id),
  semesterNumber: integer('semester_number').notNull(),
  academicYearNumber: integer('academic_year_number').notNull(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  minCredits: integer('min_credits').notNull().default(12),
  maxCredits: integer('max_credits').notNull().default(21),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgCourses = pgTable('courses', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en').notNull(),
  disciplineAr: text('discipline_ar').notNull(),
  disciplineEn: text('discipline_en').notNull(),
  credits: integer('credits').notNull().default(3),
  lectureHours: integer('lecture_hours').notNull().default(2),
  labHours: integer('lab_hours').notNull().default(2),
  tutorialHours: integer('tutorial_hours').notNull().default(0),
  descriptionAr: text('description_ar'),
  descriptionEn: text('description_en'),
  objectivesAr: text('objectives_ar'),
  objectivesEn: text('objectives_en'),
  topicsAr: text('topics_ar'),
  topicsEn: text('topics_en'),
  isElective: boolean('is_elective').notNull().default(false),
  isSharedCore: boolean('is_shared_core').notNull().default(false),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: timestamp('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgStudyPlanSemesterCourses = pgTable('study_plan_semester_courses', {
  id: serial('id').primaryKey(),
  studyPlanId: integer('study_plan_id').notNull().references(() => pgStudyPlans.id),
  semesterId: integer('semester_id').notNull().references(() => pgSemesters.id),
  courseId: integer('course_id').notNull().references(() => pgCourses.id),
  requirementType: text('requirement_type').notNull().default('department_compulsory'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgCoursePrerequisites = pgTable('course_prerequisites', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => pgCourses.id),
  prerequisiteCourseId: integer('prerequisite_course_id').notNull().references(() => pgCourses.id),
  ruleType: varchar('rule_type', { length: 8 }).notNull().default('AND'),
  minGradeRequired: varchar('min_grade_required', { length: 8 }).default('D'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgLibraryReferences = pgTable('library_references', {
  id: serial('id').primaryKey(),
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en').notNull(),
  authors: text('authors').notNull(),
  publicationYear: integer('publication_year').notNull(),
  publisher: text('publisher').notNull(),
  discipline: text('discipline').notNull(),
  resourceType: text('resource_type').notNull().default('book'),
  doi: text('doi'),
  isbn: text('isbn'),
  license: text('license').notNull().default('Creative Commons CC-BY 4.0'),
  accessType: text('access_type').notNull().default('open_access'),
  originalUrl: text('original_url').notNull(),
  localFileUrl: text('local_file_url'),
  abstractAr: text('abstract_ar'),
  abstractEn: text('abstract_en'),
  language: text('language').notNull().default('ar'),
  subject: text('subject'),
  copyrightInfo: text('copyright_info'),
  availability: text('availability').notNull().default('link_only'),
  downloadAllowed: boolean('download_allowed').notNull().default(false),
  relatedUniversityId: integer('related_university_id').references(() => pgUniversities.id),
  relatedDepartmentId: integer('related_department_id').references(() => pgDepartments.id),
  relatedProgramId: integer('related_program_id').references(() => pgAcademicPrograms.id),
  relatedCourseId: integer('related_course_id').references(() => pgCourses.id),
  sourceInstitution: text('source_institution'),
  collectedAt: timestamp('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  isVerified: boolean('is_verified').notNull().default(true),
  isDemoRecord: boolean('is_demo_record').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgSources = pgTable('sources', {
  id: serial('id').primaryKey(),
  authorityAr: text('authority_ar').notNull(),
  authorityEn: text('authority_en').notNull(),
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en').notNull(),
  typeAr: text('type_ar').notNull(),
  typeEn: text('type_en').notNull(),
  decreeNumber: text('decree_number'),
  issueDate: text('issue_date'),
  documentUrl: text('document_url').notNull(),
  verificationStatus: text('verification_status').notNull().default('verified'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgUsers = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('regular_user'),
  institutionId: integer('institution_id').references(() => pgUniversities.id),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pgUploadedDocuments = pgTable('uploaded_documents', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  authorName: text('author_name'),
  publicationYear: integer('publication_year'),
  originalSource: text('original_source'),
  categoryCode: text('category_code').notNull().default('course_summary'),
  countryId: integer('country_id').references(() => pgCountries.id),
  universityId: integer('university_id').references(() => pgUniversities.id),
  facultyId: integer('faculty_id').references(() => pgFaculties.id),
  departmentId: integer('department_id').references(() => pgDepartments.id),
  programId: integer('program_id').references(() => pgAcademicPrograms.id),
  courseId: integer('course_id').references(() => pgCourses.id),
  semesterNumber: integer('semester_number'),
  language: text('language').notNull().default('ar'),
  licenseType: text('license_type').notNull().default('Creative Commons CC-BY 4.0'),
  copyrightDeclarationAccepted: boolean('copyright_declaration_accepted').notNull().default(false),
  submitterName: text('submitter_name').notNull(),
  submitterEmail: text('submitter_email').notNull(),
  submitterUserId: integer('submitter_user_id').references(() => pgUsers.id),
  isVisitorSubmission: boolean('is_visitor_submission').notNull().default(true),
  originalFilename: text('original_filename').notNull(),
  storedFilename: text('stored_filename').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  mimeType: text('mime_type').notNull().default('application/pdf'),
  fileSha256: varchar('file_sha256', { length: 64 }).notNull(),
  storagePath: text('storage_path').notNull(),
  status: text('status').notNull().default('pending_review'),
  screeningResult: text('screening_result').default('passed_format_check'),
  rejectionReason: text('rejection_reason'),
  screeningAt: text('screening_at'),
  academicReviewAt: text('academic_review_at'),
  approvedAt: text('approved_at'),
  publishedAt: text('published_at'),
  quarantinedAt: text('quarantined_at'),
  securityNotes: text('security_notes'),
  downloadAllowed: boolean('download_allowed').notNull().default(true),
  approvedByUserId: integer('approved_by_user_id').references(() => pgUsers.id),
  downloadCount: integer('download_count').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Provenance links, authentication sessions, moderation workflow and personal
// library tables. These complete parity with the SQLite development schema.
// ---------------------------------------------------------------------------

export const pgEntitySources = pgTable('entity_sources', {
  id: serial('id').primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  sourceId: integer('source_id').notNull().references(() => pgSources.id),
  citationNote: text('citation_note'),
  verifiedAt: timestamp('verified_at').defaultNow().notNull(),
});

export const pgSessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => pgUsers.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgDocumentCategories = pgTable('document_categories', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  description: text('description'),
});

export const pgDocumentReports = pgTable('document_reports', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => pgUploadedDocuments.id),
  reporterName: text('reporter_name').notNull(),
  reporterEmail: text('reporter_email').notNull(),
  reporterUserId: integer('reporter_user_id').references(() => pgUsers.id),
  reason: text('reason').notNull(),
  details: text('details').notNull(),
  status: text('status').notNull().default('open'),
  resolvedAt: text('resolved_at'),
  resolvedByUserId: integer('resolved_by_user_id').references(() => pgUsers.id),
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgDocumentReviewActions = pgTable('document_review_actions', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => pgUploadedDocuments.id),
  reviewerUserId: integer('reviewer_user_id').notNull().references(() => pgUsers.id),
  action: text('action').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgUserSavedItems = pgTable('user_saved_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => pgUsers.id),
  itemType: text('item_type').notNull(),
  itemId: integer('item_id').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgVerificationAuditLogs = pgTable('verification_audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => pgUsers.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  beforeState: text('before_state'),
  afterState: text('after_state'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgReadingLists = pgTable('reading_lists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => pgUsers.id),
  name: text('name').notNull(),
  description: text('description'),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pgReadingListItems = pgTable('reading_list_items', {
  id: serial('id').primaryKey(),
  readingListId: integer('reading_list_id').notNull().references(() => pgReadingLists.id),
  itemType: text('item_type').notNull(),
  itemId: integer('item_id').notNull(),
  position: integer('position').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pgSchemaMigrations = pgTable('schema_migrations', {
  id: text('id').primaryKey(),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
});
