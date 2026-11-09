/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Administration console. Every action is authorised again by the server;
 * this interface only hides controls the current role cannot use.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth, roleLabel } from '../../context/AuthContext.tsx';
import { api, UploadedDocumentAPI } from '../../services/api.ts';
import { statusTone } from '../common/StateBlocks.tsx';
import {
  LayoutDashboard,
  Database,
  Library,
  FileCheck2,
  Flag,
  Users,
  ScrollText,
  HardDriveDownload,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  X,
  CheckCircle2,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Search,
  Save,
  Download,
} from 'lucide-react';

type Tab =
  | 'overview'
  | 'content'
  | 'moderation'
  | 'reports'
  | 'users'
  | 'audit'
  | 'maintenance';

const CONTENT_ENTITIES = [
  { id: 'universities', ar: 'المؤسسات', en: 'Institutions' },
  { id: 'faculties', ar: 'الكليات', en: 'Faculties' },
  { id: 'departments', ar: 'الأقسام', en: 'Departments' },
  { id: 'programs', ar: 'البرامج', en: 'Programs' },
  { id: 'study-plans', ar: 'الخطط الدراسية', en: 'Study plans' },
  { id: 'courses', ar: 'المقررات', en: 'Courses' },
  { id: 'library', ar: 'المكتبة', en: 'Library' },
  { id: 'sources', ar: 'المصادر الرسمية', en: 'Official sources' },
];

const ENTITY_COLUMNS: Record<string, string[]> = {
  universities: ['nameAr', 'nameEn', 'sector', 'generalVerificationStatus'],
  faculties: ['nameAr', 'nameEn', 'universityId'],
  departments: ['nameAr', 'nameEn', 'facultyId'],
  programs: ['nameAr', 'nameEn', 'degreeLevel', 'totalCredits'],
  'study-plans': ['versionYear', 'versionNameEn', 'isActive', 'totalCredits'],
  courses: ['code', 'titleEn', 'credits', 'verificationStatus'],
  library: ['titleEn', 'authors', 'publicationYear', 'accessType'],
  sources: ['titleEn', 'authorityEn', 'typeEn'],
};

const ENTITY_TEMPLATES: Record<string, Record<string, unknown>> = {
  universities: {
    nameAr: '',
    nameEn: '',
    sector: 'public',
    governorateId: 'sanaa',
    governorateAr: '',
    governorateEn: '',
    establishedYear: null,
    websiteUrl: '',
    licensingStatus: 'not_documented',
    accreditationStatus: 'not_documented',
    generalVerificationStatus: 'unverified',
    sourceUrl: '',
    sourceInstitution: '',
    collectedAt: new Date().toISOString(),
    lastVerifiedAt: null,
    verificationNotes: '',
    isDemoRecord: false,
  },
  faculties: {
    universityId: 1,
    nameAr: '',
    nameEn: '',
    establishedYear: null,
    sourceUrl: '',
    verificationStatus: 'unverified',
  },
  departments: {
    facultyId: 1,
    nameAr: '',
    nameEn: '',
    sourceUrl: '',
    verificationStatus: 'unverified',
  },
  programs: {
    universityId: 1,
    facultyId: 1,
    departmentId: 1,
    nameAr: '',
    nameEn: '',
    degreeLevel: 'Bachelor',
    durationYears: 4,
    totalCredits: 0,
    programmaticAccreditation: 'not_documented',
    sourceUrl: '',
    verificationStatus: 'unverified',
  },
  'study-plans': {
    programId: 1,
    versionYear: String(new Date().getFullYear()),
    versionNameAr: '',
    versionNameEn: '',
    isActive: true,
    totalCredits: 0,
    totalSemesters: 0,
    approvedDate: null,
    approvalDecree: '',
    sourceUrl: '',
    verificationStatus: 'unverified',
  },
  courses: {
    code: '',
    titleAr: '',
    titleEn: '',
    disciplineAr: '',
    disciplineEn: '',
    credits: 3,
    lectureHours: 2,
    labHours: 0,
    descriptionAr: '',
    descriptionEn: '',
    objectivesAr: [],
    objectivesEn: [],
    topicsAr: [],
    topicsEn: [],
    sourceUrl: '',
    sourceInstitution: '',
    verificationStatus: 'unverified',
  },
  library: {
    titleAr: '',
    titleEn: '',
    authors: '',
    publicationYear: new Date().getFullYear(),
    publisher: '',
    discipline: '',
    resourceType: 'book',
    language: 'ar',
    license: '',
    accessType: 'publisher_link',
    originalUrl: '',
    downloadAllowed: false,
    verificationStatus: 'unverified',
  },
  sources: {
    authorityAr: '',
    authorityEn: '',
    titleAr: '',
    titleEn: '',
    typeAr: '',
    typeEn: '',
    documentUrl: '',
    verificationStatus: 'unverified',
  },
};

const snakeToCamel = (value: string) => value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const toCamelRecord = (row: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
};

const formatDate = (value: unknown, language: 'ar' | 'en') => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-GB');
};

export const AdminView: React.FC = () => {
  const { language } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  const role = user?.role || 'regular_user';
  const isAdmin = role === 'super_admin' || role === 'admin';
  const canModerate = isAdmin || role === 'academic_reviewer';
  const canEdit = isAdmin || role === 'academic_editor';

  const [tab, setTab] = useState<Tab>(isAdmin ? 'overview' : canModerate ? 'moderation' : 'content');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [overview, setOverview] = useState<Record<string, number | string>>({});
  const [integrity, setIntegrity] = useState<{ integrity: string; foreignKeyViolations: unknown[]; journalMode: string } | null>(null);
  const [backups, setBackups] = useState<Array<{ fileName: string; sizeBytes: number; modifiedAt: string }>>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<UploadedDocumentAPI[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const [entity, setEntity] = useState('universities');
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [recordQuery, setRecordQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'bulk'>('create');
  const [editorValue, setEditorValue] = useState('');
  const [editorId, setEditorId] = useState<number | null>(null);
  const [editorError, setEditorError] = useState('');
  const [saving, setSaving] = useState(false);

  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [moderationNotes, setModerationNotes] = useState('');
  const [bulkAction, setBulkAction] = useState<'screen' | 'approve' | 'reject' | 'publish' | 'unpublish' | 'quarantine'>('approve');

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const loadTab = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      if (tab === 'overview' && canEdit) {
        const res = await api.getAdminOverview();
        setOverview(res.overview || {});
      } else if (tab === 'content' && canEdit) {
        const res = await api.getContent(entity);
        setRecords((res.records || []).map((row) => toCamelRecord(row)));
      } else if (tab === 'moderation' && canModerate) {
        const res = await api.getReviewQueue();
        setDocuments(res.documents || []);
      } else if (tab === 'reports' && canModerate) {
        const res = await api.getReports();
        setReports(res.reports || []);
      } else if (tab === 'users' && isAdmin) {
        const res = await api.getUsers();
        setUsers(res.users || []);
      } else if (tab === 'audit' && isAdmin) {
        const res = await api.getAuditLogs(200);
        setAuditLogs(res.logs || []);
      } else if (tab === 'maintenance' && isAdmin) {
        const [integrityRes, backupsRes] = await Promise.all([api.getAdminIntegrity(), api.getBackups()]);
        setIntegrity(integrityRes);
        setBackups(backupsRes.backups || []);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [tab, entity, canEdit, canModerate, isAdmin]);

  useEffect(() => {
    void loadTab();
  }, [loadTab]);

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; visible: boolean }> = [
    { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview', icon: LayoutDashboard, visible: canEdit },
    { id: 'content', label: language === 'ar' ? 'المحتوى الأكاديمي' : 'Academic content', icon: Database, visible: canEdit },
    { id: 'moderation', label: language === 'ar' ? 'مراجعة الملفات' : 'File moderation', icon: FileCheck2, visible: canModerate },
    { id: 'reports', label: language === 'ar' ? 'البلاغات' : 'Reports', icon: Flag, visible: canModerate },
    { id: 'users', label: language === 'ar' ? 'المستخدمون' : 'Users', icon: Users, visible: isAdmin },
    { id: 'audit', label: language === 'ar' ? 'سجل التدقيق' : 'Audit log', icon: ScrollText, visible: isAdmin },
    { id: 'maintenance', label: language === 'ar' ? 'الصيانة والنسخ' : 'Maintenance', icon: HardDriveDownload, visible: isAdmin },
  ];

  const openCreate = () => {
    setEditorMode('create');
    setEditorId(null);
    setEditorValue(JSON.stringify(ENTITY_TEMPLATES[entity] || {}, null, 2));
    setEditorError('');
    setEditorOpen(true);
  };

  const openEdit = (record: Record<string, unknown>) => {
    const { id, ...rest } = record;
    setEditorMode('edit');
    setEditorId(Number(id));
    setEditorValue(JSON.stringify(rest, null, 2));
    setEditorError('');
    setEditorOpen(true);
  };

  const openBulk = () => {
    setEditorMode('bulk');
    setEditorId(null);
    setEditorValue(JSON.stringify([ENTITY_TEMPLATES[entity] || {}], null, 2));
    setEditorError('');
    setEditorOpen(true);
  };

  const parseEditor = (): unknown => {
    try {
      return JSON.parse(editorValue);
    } catch (err) {
      setEditorError(`${language === 'ar' ? 'JSON غير صالح: ' : 'Invalid JSON: '}${(err as Error).message}`);
      return null;
    }
  };

  const saveEditor = async () => {
    const parsed = parseEditor();
    if (parsed === null) return;
    setSaving(true);
    setEditorError('');
    try {
      if (editorMode === 'create') {
        await api.createContent(entity, parsed as Record<string, unknown>);
        notify(language === 'ar' ? 'تم إنشاء السجل' : 'Record created');
      } else if (editorMode === 'edit' && editorId) {
        await api.updateContent(entity, editorId, parsed as Record<string, unknown>);
        notify(language === 'ar' ? 'تم تحديث السجل' : 'Record updated');
      } else {
        if (!Array.isArray(parsed)) throw new Error(language === 'ar' ? 'المطلوب مصفوفة سجلات' : 'An array of records is required');
        const res = await api.bulkCreateContent(entity, parsed as Array<Record<string, unknown>>);
        notify(
          language === 'ar'
            ? `تم إدخال ${res.succeeded} من ${parsed.length}`
            : `Imported ${res.succeeded} of ${parsed.length}`,
        );
      }
      setEditorOpen(false);
      await loadTab();
    } catch (err) {
      setEditorError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: number) => {
    if (!window.confirm(language === 'ar' ? 'حذف هذا السجل نهائياً؟ قد تفشل العملية إذا كانت هناك سجلات مرتبطة.' : 'Permanently delete this record? It may fail if related records exist.')) return;
    try {
      await api.deleteContent(entity, id);
      notify(language === 'ar' ? 'تم حذف السجل' : 'Record deleted');
      await loadTab();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const moderate = async (id: number, action: typeof bulkAction) => {
    try {
      await api.reviewDocument(id, action, moderationNotes || undefined);
      notify(language === 'ar' ? `تم تنفيذ: ${action}` : `Action applied: ${action}`);
      await loadTab();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const runBulk = async () => {
    if (selectedDocs.length === 0) return;
    try {
      const res = await api.bulkReviewDocuments(selectedDocs, bulkAction, moderationNotes || undefined);
      notify(language === 'ar' ? `نجح ${res.succeeded} من ${selectedDocs.length}` : `${res.succeeded} of ${selectedDocs.length} succeeded`);
      setSelectedDocs([]);
      await loadTab();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const updateReport = async (id: number, status: string) => {
    try {
      await api.updateReport(id, status);
      notify(language === 'ar' ? 'تم تحديث البلاغ' : 'Report updated');
      await loadTab();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const changeRole = async (id: number, newRole: string) => {
    try {
      await api.updateUserRole(id, newRole);
      notify(language === 'ar' ? 'تم تحديث الدور' : 'Role updated');
      await loadTab();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const toggleUser = async (id: number, isActive: boolean) => {
    try {
      await api.updateUserStatus(id, isActive);
      notify(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
      await loadTab();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const createBackup = async () => {
    try {
      const res = await api.createBackup();
      notify(language === 'ar' ? `تم إنشاء نسخة: ${res.backup}` : `Backup created: ${res.backup}`);
      await loadTab();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!recordQuery.trim()) return records;
    const q = recordQuery.trim().toLowerCase();
    return records.filter((record) =>
      Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(q)),
    );
  }, [records, recordQuery]);

  const columns = ENTITY_COLUMNS[entity] || ['nameAr', 'nameEn'];
  const allSelected = documents.length > 0 && selectedDocs.length === documents.length;

  return (
    <div className="py-8 md:py-10 bg-slate-50 dark:bg-[#070e1c] min-h-[70vh] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500 font-mono mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'ar' ? 'لوحة الإدارة' : 'Administration'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {language === 'ar' ? 'إدارة الدليل والمحتوى' : 'Directory & content management'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {user?.fullName} · {roleLabel(role, language)} · {language === 'ar' ? 'الصلاحيات مفروضة على الخادم' : 'permissions enforced server-side'}
            </p>
          </div>

          <button
            onClick={() => void loadTab()}
            className="inline-flex items-center gap-1.5 self-start px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5" role="tablist" aria-label="Administration sections">
          {tabs.filter((item) => item.visible).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  tab === item.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            {language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(overview).map(([key, value]) => (
                    <div key={key} className="p-4 rounded-xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] uppercase font-mono text-slate-400">{key}</div>
                      <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  {language === 'ar'
                    ? 'لا يُنشر أي ملف مرفوع تلقائياً. المسار: مرسل ← فحص أمني ← مراجعة أكاديمية ← موافقة ← نشر يدوي.'
                    : 'No uploaded file is published automatically. Flow: submitted → security screening → academic review → approved → manually published.'}
                </div>
              </div>
            )}

            {tab === 'content' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <select
                    value={entity}
                    onChange={(e) => setEntity(e.target.value)}
                    className="p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    aria-label={language === 'ar' ? 'نوع المحتوى' : 'Content type'}
                  >
                    {CONTENT_ENTITIES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {language === 'ar' ? item.ar : item.en}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={recordQuery}
                      onChange={(e) => setRecordQuery(e.target.value)}
                      placeholder={language === 'ar' ? 'تصفية السجلات...' : 'Filter records...'}
                      className="w-full ps-8 pe-2 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">{filteredRecords.length}</span>

                  <div className="flex gap-2 ms-auto">
                    <button onClick={openCreate} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700">
                      <Plus className="w-3.5 h-3.5" /> {language === 'ar' ? 'إضافة' : 'Add'}
                    </button>
                    <button onClick={openBulk} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      <Upload className="w-3.5 h-3.5" /> {language === 'ar' ? 'استيراد' : 'Bulk import'}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto bg-white dark:bg-[#0c1830]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                      <tr>
                        <th className="text-start p-2.5 font-semibold">ID</th>
                        {columns.map((column) => (
                          <th key={column} className="text-start p-2.5 font-semibold whitespace-nowrap">
                            {column}
                          </th>
                        ))}
                        <th className="text-end p-2.5 font-semibold">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRecords.map((record) => (
                        <tr key={String(record.id)} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-2.5 font-mono text-slate-400">{String(record.id)}</td>
                          {columns.map((column) => (
                            <td key={column} className="p-2.5 text-slate-700 dark:text-slate-300 max-w-[220px] truncate">
                              {String(record[column] ?? '—')}
                            </td>
                          ))}
                          <td className="p-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(record)}
                                className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                aria-label="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => void deleteRecord(Number(record.id))}
                                  className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                  aria-label="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredRecords.length === 0 && (
                        <tr>
                          <td colSpan={columns.length + 2} className="p-8 text-center text-slate-500">
                            {language === 'ar' ? 'لا توجد سجلات. استخدم «إضافة» أو «استيراد».' : 'No records. Use Add or Bulk import.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'ar'
                    ? 'الحقول المتاحة هي فقط الحقول المسموح بها في الخادم. الحقول المجهولة تُتجاهل، والقيود المرجعية (المفاتيح الأجنبية) تُفرض عند الحفظ. سجلات المصادر والتوثيق (sourceUrl، collectedAt، verificationStatus، lastVerifiedAt) ضرورية للامتثال.'
                    : 'Only server allow-listed fields are accepted. Unknown fields are ignored and foreign-key constraints are enforced on save. Provenance fields (sourceUrl, collectedAt, verificationStatus, lastVerifiedAt) are required for compliance.'}
                </p>
              </div>
            )}

            {tab === 'moderation' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <input
                    value={moderationNotes}
                    onChange={(e) => setModerationNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'ملاحظات المراجعة (تُسجل في سجل التدقيق)' : 'Moderation notes (stored in the audit trail)'}
                    className="flex-1 min-w-[200px] px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as typeof bulkAction)}
                    className="p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    aria-label={language === 'ar' ? 'إجراء جماعي' : 'Bulk action'}
                  >
                    {['screen', 'approve', 'reject', 'publish', 'unpublish', 'quarantine'].map((action) => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => void runBulk()}
                    disabled={selectedDocs.length === 0}
                    className="px-3 py-2 rounded-lg text-[11px] font-semibold bg-blue-600 text-white disabled:opacity-50"
                  >
                    {language === 'ar' ? `تطبيق على ${selectedDocs.length}` : `Apply to ${selectedDocs.length}`}
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto bg-white dark:bg-[#0c1830]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                      <tr>
                        <th className="p-2.5">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(e) =>
                              setSelectedDocs(e.target.checked ? documents.map((doc) => doc.id) : [])
                            }
                            aria-label={language === 'ar' ? 'تحديد الكل' : 'Select all'}
                          />
                        </th>
                        <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'الملف' : 'File'}</th>
                        <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'المُرسل' : 'Submitter'}</th>
                        <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                        <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                        <th className="text-end p-2.5 font-semibold">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={selectedDocs.includes(doc.id)}
                              onChange={(e) =>
                                setSelectedDocs((prev) =>
                                  e.target.checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id),
                                )
                              }
                              aria-label={`Select ${doc.title}`}
                            />
                          </td>
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 max-w-[260px] truncate">{doc.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              #{doc.id} · {Math.max(1, Math.round(doc.fileSizeBytes / 1024))} KB
                            </div>
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">{doc.submitterName}</td>
                          <td className="p-2.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-mono ${statusTone(doc.status)}`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500 whitespace-nowrap">{formatDate(doc.createdAt, language)}</td>
                          <td className="p-2.5">
                            <div className="flex flex-wrap justify-end gap-1">
                              {(['screen', 'approve', 'reject', 'publish', 'unpublish'] as const).map((action) => (
                                <button
                                  key={action}
                                  onClick={() => void moderate(doc.id, action)}
                                  className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {documents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            {language === 'ar' ? 'لا توجد ملفات في قائمة المراجعة.' : 'No files in the review queue.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'reports' && (
              <div className="space-y-2">
                {reports.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800">
                    {language === 'ar' ? 'لا توجد بلاغات.' : 'No reports.'}
                  </div>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="p-4 rounded-xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {report.reason} · {language === 'ar' ? 'ملف' : 'document'} #{report.document_id ?? report.documentId}
                        </div>
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] ${statusTone(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1.5">{report.details}</p>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {report.reporter_name ?? report.reporterName} · {formatDate(report.created_at ?? report.createdAt, language)}
                      </div>
                      {(report.status === 'open' || report.status === 'pending') && (
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => void updateReport(report.id, 'resolved')} className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-semibold">
                            {language === 'ar' ? 'حلّ' : 'Resolve'}
                          </button>
                          <button onClick={() => void updateReport(report.id, 'dismissed')} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                            {language === 'ar' ? 'رفض' : 'Dismiss'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'users' && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto bg-white dark:bg-[#0c1830]">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                    <tr>
                      <th className="text-start p-2.5 font-semibold">ID</th>
                      <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                      <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'البريد' : 'Email'}</th>
                      <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'الدور' : 'Role'}</th>
                      <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'نشط' : 'Active'}</th>
                      <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'آخر دخول' : 'Last login'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((row) => (
                      <tr key={row.id}>
                        <td className="p-2.5 font-mono text-slate-400">{row.id}</td>
                        <td className="p-2.5 text-slate-800 dark:text-slate-200">{row.full_name ?? row.fullName}</td>
                        <td className="p-2.5 text-slate-500 font-mono text-[10px]">{row.email}</td>
                        <td className="p-2.5">
                          <select
                            value={row.role}
                            disabled={!isSuperAdmin || row.id === user?.id}
                            onChange={(e) => void changeRole(row.id, e.target.value)}
                            className="p-1 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 disabled:opacity-60"
                          >
                            {['super_admin', 'admin', 'academic_editor', 'academic_reviewer', 'regular_user'].map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="checkbox"
                            checked={Boolean(row.is_active ?? row.isActive)}
                            disabled={row.id === user?.id}
                            onChange={(e) => void toggleUser(row.id, e.target.checked)}
                            aria-label={language === 'ar' ? 'تفعيل الحساب' : 'Activate account'}
                          />
                        </td>
                        <td className="p-2.5 text-slate-500">{formatDate(row.last_login_at ?? row.lastLoginAt, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'audit' && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto bg-white dark:bg-[#0c1830]">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                    <tr>
                      <th className="text-start p-2.5 font-semibold">#</th>
                      <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                      <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'الكيان' : 'Entity'}</th>
                      <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'المنفّذ' : 'Actor'}</th>
                      <th className="text-start p-2.5 font-semibold">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="p-2.5 font-mono text-slate-400">{log.id}</td>
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{log.action}</td>
                        <td className="p-2.5 text-slate-500 font-mono text-[10px]">
                          {log.entity_type ?? log.entityType}#{log.entity_id ?? log.entityId}
                        </td>
                        <td className="p-2.5 text-slate-500">{log.actor_email ?? log.actorEmail ?? '—'}</td>
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">{formatDate(log.created_at ?? log.createdAt, language)}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          {language === 'ar' ? 'لا توجد سجلات تدقيق.' : 'No audit entries.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'maintenance' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                    <Database className="w-4 h-4 text-blue-500" />
                    {language === 'ar' ? 'سلامة قاعدة البيانات' : 'Database integrity'}
                  </h2>
                  {integrity ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">integrity_check</span>
                        <span className={`font-mono font-bold ${integrity.integrity === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {integrity.integrity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">journal_mode</span>
                        <span className="font-mono">{integrity.journalMode}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">foreign_key_check</span>
                        <span className={`font-mono ${integrity.foreignKeyViolations.length === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {integrity.foreignKeyViolations.length} {language === 'ar' ? 'مخالفة' : 'violations'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{language === 'ar' ? 'تعذّر قراءة النتيجة.' : 'Result unavailable.'}</p>
                  )}
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HardDriveDownload className="w-4 h-4 text-emerald-500" />
                      {language === 'ar' ? 'النسخ الاحتياطية' : 'Backups'}
                    </h2>
                    <button
                      onClick={() => void createBackup()}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Save className="w-3.5 h-3.5" /> {language === 'ar' ? 'نسخة الآن' : 'Back up now'}
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {backups.length === 0 ? (
                      <p className="text-xs text-slate-500">{language === 'ar' ? 'لا توجد نسخ بعد.' : 'No backups yet.'}</p>
                    ) : (
                      backups.map((backup) => (
                        <div key={backup.fileName} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-[11px]">
                          <div className="min-w-0">
                            <div className="font-mono truncate text-slate-700 dark:text-slate-300">{backup.fileName}</div>
                            <div className="text-[10px] text-slate-400">
                              {Math.max(1, Math.round(backup.sizeBytes / 1024))} KB · {formatDate(backup.modifiedAt, language)}
                            </div>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                  <p className="mt-3 text-[10px] text-slate-400">
                    {language === 'ar'
                      ? 'تُنشأ النسخ بطريقة آمنة مع WAL ولا تُحذف السجلات الأصلية.'
                      : 'Backups are taken with WAL safety; original records are never deleted.'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 start-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-lg max-w-sm text-center">
          {toast}
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0c1830] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl my-4">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editorMode === 'create'
                    ? language === 'ar' ? 'إضافة سجل' : 'Create record'
                    : editorMode === 'edit'
                      ? language === 'ar' ? 'تعديل سجل' : 'Edit record'
                      : language === 'ar' ? 'استيراد سجلات' : 'Bulk import'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">{entity}{editorId ? ` #${editorId}` : ''}</p>
              </div>
              <button onClick={() => setEditorOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <textarea
                value={editorValue}
                onChange={(e) => setEditorValue(e.target.value)}
                rows={18}
                spellCheck={false}
                className="w-full p-3 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] leading-relaxed outline-none border border-slate-800"
                aria-label="Record JSON"
              />
              {editorError && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-[11px] text-red-700 dark:text-red-300">
                  {editorError}
                </div>
              )}
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'استخدم أسماء الحقول بصيغة camelCase. الحقول غير المسموح بها تُتجاهل. لا تحذف سجلات مرتبطة بمفاتيح أجنبية.'
                  : 'Use camelCase field names. Fields outside the server allow-list are ignored. Do not remove records referenced by foreign keys.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setEditorOpen(false)} className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => void saveEditor()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {language === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
