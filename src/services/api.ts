/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRoleAPI =
  | 'super_admin'
  | 'admin'
  | 'academic_editor'
  | 'academic_reviewer'
  | 'regular_user';

export interface AuthUserAPI {
  id: number;
  email: string;
  fullName: string;
  role: UserRoleAPI;
  institutionId?: number | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface UniversityRecordAPI {
  id: number;
  nameAr: string;
  nameEn: string;
  nameShort?: string;
  sector: string;
  governorateId: string;
  governorateAr: string;
  governorateEn: string;
  establishedYear: number;
  websiteUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  licensingStatus: string;
  licensingAuthorityAr?: string;
  licensingAuthorityEn?: string;
  licensingDecreeNumber?: string;
  accreditationStatus: string;
  accreditationAuthorityAr?: string;
  accreditationAuthorityEn?: string;
  accreditationCertificateNumber?: string;
  generalVerificationStatus: string;
  lastVerifiedAt?: string | null;
  verificationNotes?: string | null;
  sourceUrl?: string | null;
  sourceInstitution?: string | null;
  supportingDocumentationUrl?: string | null;
  collectedAt?: string | null;
  facultiesCount: number;
  programsCount: number;
  isDemoRecord: boolean;
}

export interface AcademicProgramAPI {
  id: number;
  universityId: number;
  facultyId: number;
  departmentId: number;
  nameAr: string;
  nameEn: string;
  degreeLevel: string;
  durationYears: number;
  totalCredits: number;
  programmaticAccreditation: string;
  programmaticAuthorityAr?: string;
  programmaticAuthorityEn?: string;
  verificationStatus?: string;
  sourceUrl?: string | null;
  lastVerifiedAt?: string | null;
}

export interface CourseAPI {
  id: number;
  code: string;
  titleAr: string;
  titleEn: string;
  disciplineAr: string;
  disciplineEn: string;
  credits: number;
  lectureHours: number;
  labHours: number;
  tutorialHours?: number;
  descriptionAr?: string;
  descriptionEn?: string;
  objectivesAr?: string[];
  objectivesEn?: string[];
  topicsAr?: string[];
  topicsEn?: string[];
  prerequisites?: string[];
  verificationStatus?: string;
  sourceUrl?: string | null;
  sourceInstitution?: string | null;
  lastVerifiedAt?: string | null;
}

export interface LibraryReferenceAPI {
  id: number;
  titleAr: string;
  titleEn: string;
  authors: string;
  publicationYear: number;
  publisher: string;
  discipline: string;
  resourceType: string;
  doi?: string | null;
  isbn?: string | null;
  license: string;
  accessType: string;
  originalUrl: string;
  localFileUrl?: string | null;
  abstractAr?: string;
  abstractEn?: string;
  language?: string;
  subject?: string | null;
  copyrightInfo?: string | null;
  availability?: string;
  downloadAllowed?: number | boolean;
  isVerified?: number | boolean;
  verificationStatus?: string;
  verificationNotes?: string | null;
  sourceInstitution?: string | null;
  relatedUniversityId?: number | null;
  relatedCourseId?: number | null;
}

export interface UploadedDocumentAPI {
  id: number;
  title: string;
  description?: string;
  authorName?: string;
  publicationYear?: number;
  originalSource?: string;
  categoryCode: string;
  universityId?: number;
  courseId?: number;
  language: string;
  licenseType: string;
  submitterName: string;
  fileSizeBytes: number;
  status:
    | 'submitted'
    | 'screening'
    | 'pending_review'
    | 'pending_academic_review'
    | 'approved'
    | 'rejected'
    | 'published'
    | 'quarantine';
  rejectionReason?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
}

export interface DatabaseTelemetryAPI {
  totalInstitutions: number;
  totalFaculties?: number;
  totalPrograms: number;
  totalCourses: number;
  totalReferences: number;
  totalOfficialSources: number;
  totalCommunityUploads: number;
  publishedCommunityDocuments?: number;
  registeredUsers: number;
  countriesSupported?: number;
  advertisingStatus: string;
  analyticsMode: string;
  databaseEngine: string;
  generatedAt?: string;
}

export interface CoverageBarometerData {
  totalInstitutions: number;
  verificationDistribution: Record<string, number>;
  sectorDistribution: Record<string, number>;
  licensingDistribution: Record<string, number>;
  accreditationDistribution: Record<string, number>;
  facultiesCount: number;
  programsCount: number;
  coursesCount: number;
  referencesCount: number;
  sourcesCount: number;
  generatedAt: string;
  isRealData: boolean;
  notes: string;
}

export interface StudyPlanSemesterAPI {
  id: number;
  semesterNumber: number;
  academicYearNumber: number;
  nameAr: string;
  nameEn: string;
  minCredits: number;
  maxCredits: number;
  courses: CourseAPI[];
}

export interface StudyPlanAPI {
  id: number;
  programId: number;
  versionYear: string;
  versionNameAr: string;
  versionNameEn: string;
  isActive: number | boolean;
  totalCredits: number;
  totalSemesters: number;
  approvedDate?: string | null;
  approvalDecree?: string | null;
}

export interface StudyPlanResponseAPI {
  plans: StudyPlanAPI[];
  activePlan: StudyPlanAPI | null;
  semesters: StudyPlanSemesterAPI[];
}

export interface SearchResultAPI {
  id: number;
  type: 'university' | 'program' | 'course' | 'reference' | 'document';
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
}

export interface SavedItemAPI {
  id: number;
  userId: number;
  itemType: string;
  itemId: number;
  notes?: string | null;
  createdAt: string;
  titleAr?: string;
  titleEn?: string;
  subtitleAr?: string;
  subtitleEn?: string;
}

export interface ReadingListAPI {
  id: number;
  name: string;
  description?: string | null;
  isPublic: number | boolean;
  items?: Array<{ id: number; itemType: string; itemId: number; notes?: string | null }>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('mta_session_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...this.getAuthHeaders(),
        ...(init.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const message =
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error: unknown }).error)
          : `Request failed (${res.status})`;
      throw new ApiError(message, res.status);
    }
    return data as T;
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request<{ user: AuthUserAPI; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, fullName: string) {
    return this.request<{ user: AuthUserAPI; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
  }

  async me() {
    return this.request<{ user: AuthUserAPI | null }>('/api/auth/me');
  }

  async logout() {
    return this.request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
  }

  async updateProfile(payload: { fullName?: string; avatarUrl?: string | null; institutionId?: number | null }) {
    return this.request<{ user: AuthUserAPI }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean; token: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async deleteAccount() {
    return this.request<{ success: boolean }>('/api/auth/delete-account', { method: 'DELETE' });
  }

  // Academic directory
  async getInstitutions(params?: {
    sector?: string;
    governorate?: string;
    licensing?: string;
    accreditation?: string;
    verification?: string;
    q?: string;
  }) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (value && value !== 'all') searchParams.set(key, value);
    }
    return this.request<{ institutions: UniversityRecordAPI[]; total: number }>(
      `/api/academic/institutions?${searchParams.toString()}`,
    );
  }

  async getInstitution(id: number) {
    return this.request<{
      institution: UniversityRecordAPI;
      faculties: any[];
      departments: any[];
      programs: AcademicProgramAPI[];
      campuses: any[];
    }>(`/api/academic/institutions/${id}`);
  }

  async getPrograms(params?: { universityId?: number; degree?: string; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.universityId) searchParams.set('universityId', String(params.universityId));
    if (params?.degree && params.degree !== 'all') searchParams.set('degree', params.degree);
    if (params?.q) searchParams.set('q', params.q);
    return this.request<{ programs: AcademicProgramAPI[] }>(`/api/academic/programs?${searchParams.toString()}`);
  }

  async getStudyPlan(programId: number) {
    return this.request<StudyPlanResponseAPI>(`/api/academic/study-plans/${programId}`);
  }

  async getCourses(params?: { discipline?: string; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.discipline && params.discipline !== 'all') searchParams.set('discipline', params.discipline);
    if (params?.q) searchParams.set('q', params.q);
    return this.request<{ courses: CourseAPI[]; total: number }>(`/api/academic/courses?${searchParams.toString()}`);
  }

  async validatePrerequisite(courseId: number, prerequisiteCourseId: number) {
    return this.request<{ valid: boolean; hasCycle: boolean; cyclePath?: number[]; message: string }>(
      '/api/academic/prerequisites/validate',
      { method: 'POST', body: JSON.stringify({ courseId, prerequisiteCourseId }) },
    );
  }

  async getLibrary(params?: { type?: string; discipline?: string; q?: string; language?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.type && params.type !== 'all') searchParams.set('type', params.type);
    if (params?.discipline && params.discipline !== 'all') searchParams.set('discipline', params.discipline);
    if (params?.language && params.language !== 'all') searchParams.set('language', params.language);
    if (params?.q) searchParams.set('q', params.q);
    return this.request<{ references: LibraryReferenceAPI[]; total: number }>(
      `/api/academic/library?${searchParams.toString()}`,
    );
  }

  async getSources() {
    return this.request<{ sources: any[] }>('/api/academic/sources');
  }

  async search(query: string, type = 'all') {
    const searchParams = new URLSearchParams({ q: query, type });
    return this.request<{ results: SearchResultAPI[]; total: number; query: string }>(
      `/api/academic/search?${searchParams.toString()}`,
    );
  }

  async getTelemetry() {
    return this.request<{ telemetry: DatabaseTelemetryAPI }>('/api/academic/analytics/summary');
  }

  async getCoverageBarometer() {
    return this.request<CoverageBarometerData>('/api/academic/coverage/barometer');
  }

  // Saved items & reading lists
  async getSavedItems() {
    return this.request<{ items: SavedItemAPI[] }>('/api/academic/saved-items');
  }

  async saveItem(itemType: string, itemId: number, notes?: string) {
    return this.request<{ success: boolean; item: SavedItemAPI }>('/api/academic/saved-items', {
      method: 'POST',
      body: JSON.stringify({ itemType, itemId, notes }),
    });
  }

  async deleteSavedItem(id: number) {
    return this.request<{ success: boolean }>(`/api/academic/saved-items/${id}`, { method: 'DELETE' });
  }

  async getReadingLists() {
    return this.request<{ readingLists: ReadingListAPI[] }>('/api/academic/reading-lists');
  }

  async createReadingList(name: string, description?: string) {
    return this.request<{ readingList: ReadingListAPI }>('/api/academic/reading-lists', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async addReadingListItem(listId: number, itemType: string, itemId: number) {
    return this.request<{ item: any }>(`/api/academic/reading-lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify({ itemType, itemId }),
    });
  }

  async deleteReadingList(listId: number) {
    return this.request<{ success: boolean }>(`/api/academic/reading-lists/${listId}`, { method: 'DELETE' });
  }

  // Community PDF workflow
  async uploadDocument(formData: FormData) {
    return this.request<{ success: boolean; documentId: number; status: string; message: string }>(
      '/api/documents/upload',
      { method: 'POST', body: formData },
    );
  }

  async getPublishedDocuments(params?: {
    universityId?: number;
    courseId?: number;
    category?: string;
    query?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.universityId) searchParams.set('universityId', String(params.universityId));
    if (params?.courseId) searchParams.set('courseId', String(params.courseId));
    if (params?.category) searchParams.set('category', params.category);
    if (params?.query) searchParams.set('query', params.query);
    return this.request<{ documents: UploadedDocumentAPI[]; total: number }>(
      `/api/documents/published?${searchParams.toString()}`,
    );
  }

  documentDownloadUrl(id: number) {
    return `${API_BASE}/api/documents/${id}/download`;
  }

  async reportDocument(
    id: number,
    payload: { reporterName: string; reporterEmail: string; reason: string; details: string },
  ) {
    return this.request<{ success: boolean }>(`/api/documents/${id}/report`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getReviewQueue() {
    return this.request<{ documents: UploadedDocumentAPI[] }>('/api/documents/admin/review-queue');
  }

  async reviewDocument(
    id: number,
    action: 'screen' | 'approve' | 'reject' | 'publish' | 'unpublish' | 'quarantine',
    notes?: string,
  ) {
    return this.request<{ success: boolean; status: string }>(`/api/documents/admin/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    });
  }

  async bulkReviewDocuments(
    ids: number[],
    action: 'screen' | 'approve' | 'reject' | 'publish' | 'unpublish' | 'quarantine',
    notes?: string,
  ) {
    return this.request<{ succeeded: number; results: any[] }>('/api/documents/admin/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ ids, action, notes }),
    });
  }

  async getReports() {
    return this.request<{ reports: any[] }>('/api/documents/admin/reports');
  }

  async updateReport(id: number, status: string, resolutionNotes?: string) {
    return this.request<{ success: boolean }>(`/api/documents/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNotes }),
    });
  }

  // Administration
  async getAdminOverview() {
    return this.request<{ overview: Record<string, number | string> }>('/api/admin/overview');
  }

  async getAdminIntegrity() {
    return this.request<{ integrity: string; foreignKeyViolations: unknown[]; journalMode: string }>(
      '/api/admin/integrity',
    );
  }

  async getAuditLogs(limit = 100) {
    return this.request<{ logs: any[] }>(`/api/admin/audit-logs?limit=${limit}`);
  }

  async getUsers() {
    return this.request<{ users: any[] }>('/api/admin/users');
  }

  async updateUserRole(id: number, role: string) {
    return this.request<{ success: boolean }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async updateUserStatus(id: number, isActive: boolean) {
    return this.request<{ success: boolean }>(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async getContent(entity: string) {
    return this.request<{ entity: string; records: any[] }>(`/api/admin/content/${entity}`);
  }

  async createContent(entity: string, record: Record<string, unknown>) {
    return this.request<{ success: boolean; record: any }>(`/api/admin/content/${entity}`, {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  async updateContent(entity: string, id: number, record: Record<string, unknown>) {
    return this.request<{ success: boolean; record: any }>(`/api/admin/content/${entity}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(record),
    });
  }

  async deleteContent(entity: string, id: number) {
    return this.request<{ success: boolean }>(`/api/admin/content/${entity}/${id}`, { method: 'DELETE' });
  }

  async bulkCreateContent(entity: string, records: Array<Record<string, unknown>>) {
    return this.request<{ succeeded: number; results: any[] }>(`/api/admin/content/${entity}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  }

  async verifyInstitution(id: number, payload: Record<string, unknown>) {
    return this.request<{ success: boolean; record: any }>(`/api/admin/universities/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getBackups() {
    return this.request<{ backups: Array<{ fileName: string; sizeBytes: number; modifiedAt: string }> }>(
      '/api/admin/backups',
    );
  }

  async createBackup() {
    return this.request<{ success: boolean; backup: string }>('/api/admin/backups', { method: 'POST' });
  }
}

export const api = new ApiService();
