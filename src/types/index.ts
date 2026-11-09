/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';
export type Theme = 'light' | 'dark';

export type NavigationView = 
  | 'home' 
  | 'universities' 
  | 'programs' 
  | 'curricula' 
  | 'courses' 
  | 'library' 
  | 'external-libraries'
  | 'search' 
  | 'saved' 
  | 'admin';

export type UserRole = 
  | 'super_admin' 
  | 'admin' 
  | 'academic_editor' 
  | 'academic_reviewer' 
  | 'regular_user';

// Strict decoupled statuses per user requirements
export type LicensingStatus = 
  | 'officially_licensed'
  | 'license_under_verification'
  | 'partially_verified'
  | 'not_documented'
  | 'unknown'
  | 'unlicensed'
  | 'suspended'
  | 'revoked';

export type InstitutionalAccreditationStatus = 
  | 'institutionally_accredited'
  | 'accreditation_under_verification'
  | 'candidate_status'
  | 'partially_verified'
  | 'not_documented'
  | 'unknown'
  | 'not_accredited'
  | 'suspended';

export type ProgrammaticAccreditationStatus = 
  | 'programmatically_accredited'
  | 'accreditation_under_verification'
  | 'candidate_status'
  | 'partially_verified'
  | 'not_documented'
  | 'unknown'
  | 'not_accredited';

export type GeneralVerificationStatus = 
  | 'verified_complete'
  | 'partially_verified'
  | 'under_verification'
  | 'unverified'
  | 'needs_update';

export type InstitutionSector = 
  | 'public' 
  | 'private' 
  | 'community_college' 
  | 'independent_college' 
  | 'affiliated_college' 
  | 'specialized_institute';

export type AcademicDegreeLevel = 
  | 'Diploma' 
  | 'Associate' 
  | 'Bachelor' 
  | 'Higher Diploma' 
  | 'Master' 
  | 'PhD' 
  | 'Fellowship';

export type ReferenceResourceType = 
  | 'book' 
  | 'research_paper' 
  | 'dissertation' 
  | 'journal_article' 
  | 'oer' 
  | 'proceedings';

export type ReferenceAccessType = 
  | 'open_access' 
  | 'free_download' 
  | 'publisher_link';

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface OfficialSource {
  id: number;
  authorityName: string;
  sourceTitle: string;
  sourceType: 'ministerial_decree' | 'accreditation_bulletin' | 'university_bylaw' | 'official_portal' | 'academic_catalog';
  referenceNumber?: string;
  sourceUrl?: string;
  publicationDate?: string;
  documentHash?: string;
  notes?: string;
}

export interface UniversityRecord {
  id: number;
  countryCode: string;
  nameAr: string;
  nameEn: string;
  abbreviation?: string;
  sector: InstitutionSector;
  governorate: string;
  city?: string;
  establishedYear?: number;
  websiteUrl?: string;
  logoUrl?: string;
  
  // Decoupled licensing
  licensingStatus: LicensingStatus;
  licensingAuthority?: string;
  licensingSourceId?: number;
  licensingSourceUrl?: string;
  licensingDate?: string;

  // Decoupled institutional accreditation
  institutionalAccreditationStatus: InstitutionalAccreditationStatus;
  accreditationAuthority?: string;
  accreditationSourceId?: number;
  accreditationSourceUrl?: string;
  accreditationDate?: string;

  // Audit
  generalVerificationStatus: GeneralVerificationStatus;
  lastVerifiedAt?: string;
  verifiedByReviewer?: string;
  notes?: string;

  // Counters
  facultiesCount?: number;
  programsCount?: number;
  branchesCount?: number;
}
