/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 1. Countries
export const countries = sqliteTable('countries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // e.g. "YE"
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  flagEmoji: text('flag_emoji').notNull().default('🇾🇪'),
  isStartingCountry: integer('is_starting_country', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 2. Universities & Educational Institutions
export const universities = sqliteTable('universities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  countryId: integer('country_id').notNull().references(() => countries.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  nameShort: text('name_short'),
  sector: text('sector', { 
    enum: ['public', 'private', 'community_college', 'independent_college', 'affiliated_college', 'specialized_institute'] 
  }).notNull().default('public'),
  governorateId: text('governorate_id').notNull(),
  governorateAr: text('governorate_ar').notNull(),
  governorateEn: text('governorate_en').notNull(),
  establishedYear: integer('established_year').notNull(),
  websiteUrl: text('website_url'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  logoUrl: text('logo_url'),
  
  // Decoupled Licensing Status
  licensingStatus: text('licensing_status', {
    enum: ['officially_licensed', 'unlicensed', 'license_under_verification', 'partially_verified', 'suspended', 'revoked', 'not_documented', 'unknown']
  }).notNull().default('license_under_verification'),
  licensingAuthorityAr: text('licensing_authority_ar'),
  licensingAuthorityEn: text('licensing_authority_en'),
  licensingDecreeNumber: text('licensing_decree_number'),
  licensingDecreeDate: text('licensing_decree_date'),
  
  // Decoupled Institutional Accreditation Status
  accreditationStatus: text('accreditation_status', {
    enum: ['institutionally_accredited', 'not_accredited', 'accreditation_under_verification', 'candidate_status', 'partially_verified', 'suspended', 'not_documented', 'unknown']
  }).notNull().default('accreditation_under_verification'),
  accreditationAuthorityAr: text('accreditation_authority_ar'),
  accreditationAuthorityEn: text('accreditation_authority_en'),
  accreditationCertificateNumber: text('accreditation_certificate_number'),
  accreditationDate: text('accreditation_date'),

  // General Verification & Audit
  generalVerificationStatus: text('general_verification_status', {
    enum: ['verified_complete', 'partially_verified', 'under_verification', 'unverified', 'data_incomplete', 'needs_update']
  }).notNull().default('under_verification'),
  lastVerifiedAt: text('last_verified_at'),
  verificationNotes: text('verification_notes'),
  sourceUrl: text('source_url'),
  isDemoRecord: integer('is_demo_record', { mode: 'boolean' }).notNull().default(false),
  facultiesCount: integer('faculties_count').notNull().default(0),
  programsCount: integer('programs_count').notNull().default(0),
  collectedAt: text('collected_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 3. Campuses & Branches
export const campuses = sqliteTable('campuses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  universityId: integer('university_id').notNull().references(() => universities.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  governorateAr: text('governorate_ar').notNull(),
  governorateEn: text('governorate_en').notNull(),
  city: text('city'),
  address: text('address'),
  isMainCampus: integer('is_main_campus', { mode: 'boolean' }).notNull().default(false),
  establishedYear: integer('established_year'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 4. Faculties / Colleges
export const faculties = sqliteTable('faculties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  universityId: integer('university_id').notNull().references(() => universities.id),
  campusId: integer('campus_id').references(() => campuses.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  deanName: text('dean_name'),
  establishedYear: integer('established_year'),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: text('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 5. Departments
export const departments = sqliteTable('departments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  facultyId: integer('faculty_id').notNull().references(() => faculties.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  headOfDepartment: text('head_of_department'),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: text('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 6. Academic Programs
export const academicPrograms = sqliteTable('academic_programs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  departmentId: integer('department_id').notNull().references(() => departments.id),
  facultyId: integer('faculty_id').notNull().references(() => faculties.id),
  universityId: integer('university_id').notNull().references(() => universities.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  degreeLevel: text('degree_level', {
    enum: ['Diploma', 'Bachelor', 'HigherDiploma', 'Master', 'Doctorate', 'Fellowship']
  }).notNull().default('Bachelor'),
  studyType: text('study_type', {
    enum: ['Regular', 'Distance', 'Hybrid']
  }).notNull().default('Regular'),
  durationYears: integer('duration_years').notNull().default(4),
  totalCredits: integer('total_credits').notNull().default(132),
  programmaticAccreditation: text('programmatic_accreditation', {
    enum: ['programmatically_accredited', 'not_accredited', 'accreditation_under_verification', 'candidate_status', 'partially_verified', 'not_documented', 'unknown']
  }).notNull().default('accreditation_under_verification'),
  programmaticAuthorityAr: text('programmatic_authority_ar'),
  programmaticAuthorityEn: text('programmatic_authority_en'),
  isDemoRecord: integer('is_demo_record', { mode: 'boolean' }).notNull().default(false),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: text('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 7. Study Plans (Preserving Historical Versions)
export const studyPlans = sqliteTable('study_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  programId: integer('program_id').notNull().references(() => academicPrograms.id),
  versionYear: text('version_year').notNull(), // e.g. "2024"
  versionNameAr: text('version_name_ar').notNull(), // e.g. "الخطة الدراسية المعتمدة 2024"
  versionNameEn: text('version_name_en').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  totalCredits: integer('total_credits').notNull(),
  totalSemesters: integer('total_semesters').notNull(),
  approvedDate: text('approved_date'),
  approvalDecree: text('approval_decree'),
  isDemoRecord: integer('is_demo_record', { mode: 'boolean' }).notNull().default(false),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: text('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 8. Semesters
export const semesters = sqliteTable('semesters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studyPlanId: integer('study_plan_id').notNull().references(() => studyPlans.id),
  semesterNumber: integer('semester_number').notNull(), // 1, 2, 3...
  academicYearNumber: integer('academic_year_number').notNull(), // Year 1, 2, 3...
  nameAr: text('name_ar').notNull(), // e.g. "الفصل الدراسي الأول - السنة الأولى"
  nameEn: text('name_en').notNull(),
  minCredits: integer('min_credits').notNull().default(12),
  maxCredits: integer('max_credits').notNull().default(21),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 9. Courses (Reusable Across Study Plans)
export const courses = sqliteTable('courses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // e.g. "CS101", "MED101"
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
  objectivesAr: text('objectives_ar'), // JSON array string
  objectivesEn: text('objectives_en'), // JSON array string
  topicsAr: text('topics_ar'), // JSON array string
  topicsEn: text('topics_en'), // JSON array string
  isElective: integer('is_elective', { mode: 'boolean' }).notNull().default(false),
  isSharedCore: integer('is_shared_core', { mode: 'boolean' }).notNull().default(false),
  sourceUrl: text('source_url'),
  sourceInstitution: text('source_institution'),
  collectedAt: text('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 10. Study Plan Semester Courses (Relational Link)
export const studyPlanSemesterCourses = sqliteTable('study_plan_semester_courses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studyPlanId: integer('study_plan_id').notNull().references(() => studyPlans.id),
  semesterId: integer('semester_id').notNull().references(() => semesters.id),
  courseId: integer('course_id').notNull().references(() => courses.id),
  requirementType: text('requirement_type', {
    enum: ['university_compulsory', 'university_elective', 'faculty_compulsory', 'faculty_elective', 'department_compulsory', 'department_elective', 'free_elective']
  }).notNull().default('department_compulsory'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 11. Course Prerequisites (Supports AND/OR and acyclic validation)
export const coursePrerequisites = sqliteTable('course_prerequisites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courseId: integer('course_id').notNull().references(() => courses.id),
  prerequisiteCourseId: integer('prerequisite_course_id').notNull().references(() => courses.id),
  ruleType: text('rule_type', { enum: ['AND', 'OR'] }).notNull().default('AND'),
  minGradeRequired: text('min_grade_required').default('D'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 12. Library References
export const libraryReferences = sqliteTable('library_references', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en').notNull(),
  authors: text('authors').notNull(),
  publicationYear: integer('publication_year').notNull(),
  publisher: text('publisher').notNull(),
  discipline: text('discipline').notNull(),
  resourceType: text('resource_type', {
    enum: ['book', 'research_paper', 'dissertation', 'journal', 'oer']
  }).notNull().default('book'),
  doi: text('doi'),
  isbn: text('isbn'),
  license: text('license').notNull().default('Creative Commons CC-BY 4.0'),
  accessType: text('access_type', {
    enum: ['open_access', 'free_download', 'external_link']
  }).notNull().default('open_access'),
  originalUrl: text('original_url').notNull(),
  localFileUrl: text('local_file_url'),
  abstractAr: text('abstract_ar'),
  abstractEn: text('abstract_en'),
  isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(true),
  isDemoRecord: integer('is_demo_record', { mode: 'boolean' }).notNull().default(false),
  language: text('language').notNull().default('ar'),
  subject: text('subject'),
  copyrightInfo: text('copyright_info'),
  availability: text('availability').notNull().default('link_only'),
  downloadAllowed: integer('download_allowed', { mode: 'boolean' }).notNull().default(false),
  relatedUniversityId: integer('related_university_id').references(() => universities.id),
  relatedDepartmentId: integer('related_department_id').references(() => departments.id),
  relatedProgramId: integer('related_program_id').references(() => academicPrograms.id),
  relatedCourseId: integer('related_course_id').references(() => courses.id),
  sourceInstitution: text('source_institution'),
  collectedAt: text('collected_at'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  lastVerifiedAt: text('last_verified_at'),
  supportingDocumentationUrl: text('supporting_documentation_url'),
  verificationNotes: text('verification_notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 13. Official Sources Registry
export const sources = sqliteTable('sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  authorityAr: text('authority_ar').notNull(),
  authorityEn: text('authority_en').notNull(),
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en').notNull(),
  typeAr: text('type_ar').notNull(), // e.g. "قانون جمهوري", "قرار وزاري", "دليل معايير"
  typeEn: text('type_en').notNull(),
  decreeNumber: text('decree_number'),
  issueDate: text('issue_date'),
  documentUrl: text('document_url').notNull(),
  verificationStatus: text('verification_status', {
    enum: ['verified', 'under_review', 'archived']
  }).notNull().default('verified'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 14. Entity Sources Link
export const entitySources = sqliteTable('entity_sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type', {
    enum: ['university', 'faculty', 'program', 'study_plan', 'course', 'reference']
  }).notNull(),
  entityId: integer('entity_id').notNull(),
  sourceId: integer('source_id').notNull().references(() => sources.id),
  citationNote: text('citation_note'),
  verifiedAt: text('verified_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 15. Users (RBAC)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role', {
    enum: ['super_admin', 'admin', 'academic_editor', 'academic_reviewer', 'regular_user']
  }).notNull().default('regular_user'),
  institutionId: integer('institution_id').references(() => universities.id),
  avatarUrl: text('avatar_url'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 16. Sessions
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 17. Document Categories
export const documentCategories = sqliteTable('document_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // e.g. "course_summary", "lecture_notes"
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  description: text('description'),
});

// 18. Community Uploaded Documents (Mandatory Academic Contributions)
export const uploadedDocuments = sqliteTable('uploaded_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  authorName: text('author_name'),
  publicationYear: integer('publication_year'),
  originalSource: text('original_source'),
  categoryCode: text('category_code').notNull().default('course_summary'),
  
  // Academic Association Hierarchy
  countryId: integer('country_id').references(() => countries.id),
  universityId: integer('university_id').references(() => universities.id),
  facultyId: integer('faculty_id').references(() => faculties.id),
  departmentId: integer('department_id').references(() => departments.id),
  programId: integer('program_id').references(() => academicPrograms.id),
  courseId: integer('course_id').references(() => courses.id),
  semesterNumber: integer('semester_number'),
  language: text('language').notNull().default('ar'),
  
  // Legal & Licensing Declarations
  licenseType: text('license_type').notNull().default('unknown'),
  copyrightDeclarationAccepted: integer('copyright_declaration_accepted', { mode: 'boolean' }).notNull().default(false),
  
  // Submitter details
  submitterName: text('submitter_name').notNull(),
  submitterEmail: text('submitter_email').notNull(),
  submitterUserId: integer('submitter_user_id').references(() => users.id),
  isVisitorSubmission: integer('is_visitor_submission', { mode: 'boolean' }).notNull().default(true),
  
  // File Security & Storage
  originalFilename: text('original_filename').notNull(),
  storedFilename: text('stored_filename').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  mimeType: text('mime_type').notNull().default('application/pdf'),
  fileSha256: text('file_sha256').notNull(), // Duplicate detection
  storagePath: text('storage_path').notNull(),
  
  // Workflow: submitted -> screening -> pending_academic_review -> approved/rejected -> published
  status: text('status', {
    enum: ['submitted', 'screening', 'pending_review', 'pending_academic_review', 'approved', 'rejected', 'published', 'quarantine']
  }).notNull().default('pending_academic_review'),
  screeningResult: text('screening_result').default('passed_format_check'),
  rejectionReason: text('rejection_reason'),
  screeningAt: text('screening_at'),
  academicReviewAt: text('academic_review_at'),
  approvedAt: text('approved_at'),
  publishedAt: text('published_at'),
  quarantinedAt: text('quarantined_at'),
  securityNotes: text('security_notes'),
  downloadAllowed: integer('download_allowed', { mode: 'boolean' }).notNull().default(true),
  approvedByUserId: integer('approved_by_user_id').references(() => users.id),
  downloadCount: integer('download_count').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 19. Document Reports & Intellectual Property Complaints
export const documentReports = sqliteTable('document_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  documentId: integer('document_id').notNull().references(() => uploadedDocuments.id),
  reporterName: text('reporter_name').notNull(),
  reporterEmail: text('reporter_email').notNull(),
  reporterUserId: integer('reporter_user_id').references(() => users.id),
  reason: text('reason', {
    enum: ['copyright_infringement', 'inappropriate_content', 'incorrect_metadata', 'malware_suspicion', 'other']
  }).notNull(),
  details: text('details').notNull(),
  status: text('status', {
    enum: ['open', 'investigating', 'resolved', 'dismissed']
  }).notNull().default('open'),
  resolvedAt: text('resolved_at'),
  resolvedByUserId: integer('resolved_by_user_id').references(() => users.id),
  resolutionNotes: text('resolution_notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 20. Document Review Actions (Full Audit History)
export const documentReviewActions = sqliteTable('document_review_actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  documentId: integer('document_id').notNull().references(() => uploadedDocuments.id),
  reviewerUserId: integer('reviewer_user_id').notNull().references(() => users.id),
  action: text('action', {
    enum: ['screen', 'screen_pass', 'screen_fail', 'approve', 'reject', 'publish', 'quarantine', 'unpublish']
  }).notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 21. User Saved Items & Personal Library
export const userSavedItems = sqliteTable('user_saved_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  itemType: text('item_type', {
    enum: ['university', 'program', 'course', 'reference', 'document']
  }).notNull(),
  itemId: integer('item_id').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 22. Verification Audit Logs
export const verificationAuditLogs = sqliteTable('verification_audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(), // e.g. "UPDATE_LICENSING_STATUS"
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  beforeState: text('before_state'), // JSON snapshot
  afterState: text('after_state'), // JSON snapshot
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 23. Reading Lists
export const readingLists = sqliteTable('reading_lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const readingListItems = sqliteTable('reading_list_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  readingListId: integer('reading_list_id').notNull().references(() => readingLists.id),
  itemType: text('item_type').notNull(),
  itemId: integer('item_id').notNull(),
  position: integer('position').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});
