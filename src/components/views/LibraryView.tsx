/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Academic library: curated references plus community publications that have
 * completed moderation. Downloads are only offered when the record explicitly
 * allows them; otherwise the original source is linked.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, LibraryReferenceAPI, UploadedDocumentAPI } from '../../services/api.ts';
import { EmptyState, ErrorState, LoadingState } from '../common/StateBlocks.tsx';
import {
  BookOpen,
  Search,
  ExternalLink,
  Bookmark,
  Download,
  FileText,
  Globe,
  ShieldCheck,
  Flag,
  X,
  Link2,
  Loader2,
} from 'lucide-react';

const RESOURCE_TYPES: Record<string, { ar: string; en: string }> = {
  book: { ar: 'كتاب أكاديمي', en: 'Academic Book' },
  research_paper: { ar: 'بحث علمي', en: 'Research Paper' },
  dissertation: { ar: 'رسالة / أطروحة', en: 'Thesis / Dissertation' },
  thesis: { ar: 'رسالة / أطروحة', en: 'Thesis / Dissertation' },
  journal_article: { ar: 'مقالة محكمة', en: 'Journal Article' },
  journal: { ar: 'دورية علمية', en: 'Academic Journal' },
  dictionary: { ar: 'معجم', en: 'Dictionary' },
  encyclopedia: { ar: 'موسوعة', en: 'Encyclopedia' },
  oer: { ar: 'مصدر تعليمي مفتوح', en: 'Open Educational Resource' },
  proceedings: { ar: 'وقائع مؤتمر', en: 'Conference Proceedings' },
  lecture_notes: { ar: 'ملاحظات محاضرات', en: 'Lecture Notes' },
};

const ACCESS_LABELS: Record<string, { ar: string; en: string }> = {
  open_access: { ar: 'وصول حر', en: 'Open Access' },
  free_download: { ar: 'تحميل مجاني', en: 'Free Download' },
  publisher_link: { ar: 'رابط الناشر', en: 'Publisher Link' },
  subscription: { ar: 'اشتراك', en: 'Subscription' },
  restricted: { ar: 'مقيّد', en: 'Restricted' },
};

interface LibraryViewProps {
  onOpenAuth?: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onOpenAuth }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<'references' | 'community'>('references');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [access, setAccess] = useState('all');
  const [referenceList, setReferenceList] = useState<LibraryReferenceAPI[]>([]);
  const [documents, setDocuments] = useState<UploadedDocumentAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [toast, setToast] = useState('');
  const [reporting, setReporting] = useState<UploadedDocumentAPI | null>(null);
  const [reportReason, setReportReason] = useState('copyright');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      if (tab === 'references') {
        const res = await api.getLibrary({ q: query, type });
        setReferenceList(res.references || []);
      } else {
        const res = await api.getPublishedDocuments({ query: query || undefined });
        setDocuments(res.documents || []);
      }
    } catch (err) {
      setError(
        language === 'ar'
          ? `تعذّر تحميل المكتبة: ${(err as Error).message}`
          : `Unable to load the library: ${(err as Error).message}`,
      );
      setReferenceList([]);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [tab, query, type, language]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  useEffect(() => {
    if (!user) {
      setSavedIds([]);
      return;
    }
    api
      .getSavedItems()
      .then((res) =>
        setSavedIds((res.items || []).filter((i) => i.itemType === 'reference').map((i) => i.itemId)),
      )
      .catch(() => setSavedIds([]));
  }, [user]);

  const handleSave = async (reference: LibraryReferenceAPI) => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    try {
      await api.saveItem('reference', reference.id);
      setSavedIds((prev) => [...new Set([...prev, reference.id])]);
      setToast(language === 'ar' ? 'تم الحفظ في مكتبتك' : 'Saved to your library');
    } catch (err) {
      setToast((err as Error).message);
    }
    setTimeout(() => setToast(''), 2500);
  };

  const submitReport = async () => {
    if (!reporting) return;
    if (reportDetails.trim().length < 10) {
      setToast(language === 'ar' ? 'يرجى وصف سبب الإبلاغ (10 أحرف على الأقل)' : 'Please describe the issue (at least 10 characters)');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    setReportBusy(true);
    try {
      await api.reportDocument(reporting.id, {
        reporterName: user?.fullName || (language === 'ar' ? 'زائر' : 'Visitor'),
        reporterEmail: user?.email || 'visitor@example.invalid',
        reason: reportReason,
        details: reportDetails.trim(),
      });
      setReporting(null);
      setReportDetails('');
      setToast(language === 'ar' ? 'تم استلام البلاغ وسيراجعه فريق الإشراف' : 'Report received and queued for moderation');
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setReportBusy(false);
      setTimeout(() => setToast(''), 3500);
    }
  };

  const accessOptions = Array.from(
    new Set(referenceList.map((r) => r.accessType).filter(Boolean)),
  );

  return (
    <div className="py-8 md:py-12 bg-slate-50 dark:bg-[#070e1c] min-h-[70vh] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono mb-1">
            <BookOpen className="w-4 h-4" />
            <span>{language === 'ar' ? 'المكتبة الأكاديمية الرقمية' : 'Academic Digital Library'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            {language === 'ar' ? 'المراجع والموارد الأكاديمية' : 'Academic References & Resources'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
            {language === 'ar'
              ? 'كتب، أبحاث، رسائل جامعية، دوريات، معاجم، ومصادر تعليمية مفتوحة، مع بيانات الحقوق والترخيص لكل مصدر. لا يُتاح التحميل إلا عند وجود إذن قانوني صريح.'
              : 'Books, research, theses, journals, dictionaries and open educational resources, each with copyright and licence metadata. Downloads are offered only where legal authorisation is explicit.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setTab('references')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              tab === 'references'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-[#0c1830] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {language === 'ar' ? 'المراجع الموثقة' : 'Curated references'}
          </button>
          <button
            onClick={() => setTab('community')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              tab === 'community'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-[#0c1830] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {language === 'ar' ? 'المنشورات المجتمعية المعتمدة' : 'Approved community publications'}
          </button>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 shadow-sm mb-8 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'ابحث بالعنوان أو المؤلف أو DOI / ISBN...'
                  : 'Search title, author, DOI or ISBN...'
              }
              className="w-full ps-10 pe-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              aria-label={language === 'ar' ? 'بحث المكتبة' : 'Search library'}
            />
          </div>
          {tab === 'references' ? (
            <>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                aria-label={language === 'ar' ? 'نوع المصدر' : 'Resource type'}
              >
                <option value="all">{language === 'ar' ? 'جميع الأنواع' : 'All types'}</option>
                {Object.entries(RESOURCE_TYPES).map(([value, labels]) => (
                  <option key={value} value={value}>
                    {labels[language]}
                  </option>
                ))}
              </select>
              <select
                value={access}
                onChange={(e) => setAccess(e.target.value)}
                className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                aria-label={language === 'ar' ? 'طريقة الوصول' : 'Access type'}
              >
                <option value="all">{language === 'ar' ? 'كل طرق الوصول' : 'All access types'}</option>
                {accessOptions.map((value) => (
                  <option key={value} value={value}>
                    {ACCESS_LABELS[value]?.[language] || value}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="sm:col-span-2 text-[11px] text-slate-500 flex items-center gap-2 px-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              {language === 'ar'
                ? 'لا يظهر هنا إلا ما اعتمده المحرر الأكاديمي ونُشر بعد المراجعة.'
                : 'Only items approved by an academic reviewer and published appear here.'}
            </div>
          )}
        </div>

        {isLoading ? (
          <LoadingState label={language === 'ar' ? 'جارٍ تحميل المكتبة...' : 'Loading library...'} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : tab === 'references' ? (
          referenceList.length === 0 ? (
            <EmptyState
              title={language === 'ar' ? 'لا توجد مراجع مطابقة' : 'No matching references'}
              description={
                language === 'ar'
                  ? 'لم تُدخل مراجع مطابقة بعد. لا تُنشأ مراجع أو بيانات نشر تلقائياً.'
                  : 'No matching references have been entered. Bibliographic records are never generated automatically.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {referenceList
                .filter((ref) => access === 'all' || ref.accessType === access)
                .map((ref) => {
                  const isSaved = savedIds.includes(ref.id);
                  const canDownload = Boolean(ref.downloadAllowed) && Boolean(ref.localFileUrl);
                  return (
                    <article
                      key={ref.id}
                      className="rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            {RESOURCE_TYPES[ref.resourceType]?.[language] || ref.resourceType}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {ACCESS_LABELS[ref.accessType]?.[language] || ref.accessType}
                          </span>
                          {ref.verificationStatus && (
                            <span className="text-[10px] font-mono text-slate-400">{ref.verificationStatus}</span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {language === 'ar' ? ref.titleAr : ref.titleEn}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{ref.authors}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {ref.publisher} · {ref.publicationYear} · {ref.language || '—'}
                        </p>

                        {ref.abstractAr || ref.abstractEn ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed line-clamp-3">
                            {language === 'ar' ? ref.abstractAr : ref.abstractEn}
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono text-slate-500">
                          {ref.doi && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">DOI: {ref.doi}</span>}
                          {ref.isbn && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">ISBN: {ref.isbn}</span>}
                          {ref.license && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{ref.license}</span>}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void handleSave(ref)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSaved
                                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                            aria-label={language === 'ar' ? 'حفظ المرجع' : 'Save reference'}
                          >
                            <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                          </button>
                          {canDownload ? (
                            <a
                              href={ref.localFileUrl!}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                              download
                            >
                              <Download className="w-3.5 h-3.5" /> {language === 'ar' ? 'تحميل مرخّص' : 'Licensed download'}
                            </a>
                          ) : (
                            <a
                              href={ref.originalUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {language === 'ar' ? 'المصدر الأصلي' : 'Original source'}
                            </a>
                          )}
                        </div>
                        {ref.copyrightInfo && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[45%]" title={ref.copyrightInfo}>
                            {ref.copyrightInfo}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>
          )
        ) : documents.length === 0 ? (
          <EmptyState
            title={language === 'ar' ? 'لا توجد منشورات مجتمعية منشورة' : 'No published community documents'}
            description={
              language === 'ar'
                ? 'تظهر هنا فقط الملفات التي اجتازت الفحص الأمني والمراجعة الأكاديمية وتم نشرها يدوياً.'
                : 'Only files that passed security screening and academic review, then were published explicitly, appear here.'
            }
          />
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <article
                key={doc.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{doc.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {doc.authorName || doc.submitterName} · {doc.publicationYear || '—'} ·{' '}
                      {Math.max(1, Math.round(doc.fileSizeBytes / 1024))} KB
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      {language === 'ar' ? 'نُشر بعد المراجعة' : 'Published after review'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setReporting(doc)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600"
                  >
                    <Flag className="w-3.5 h-3.5" /> {language === 'ar' ? 'إبلاغ' : 'Report'}
                  </button>
                  <a
                    href={api.documentDownloadUrl(doc.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Download className="w-3.5 h-3.5" /> {language === 'ar' ? 'تحميل' : 'Download'}
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-[11px] text-slate-500 flex items-start gap-2">
          <Globe className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          {language === 'ar'
            ? 'التحميل المباشر متاح فقط للمواد التي يسمح ترخيصها بذلك. في جميع الحالات الأخرى يتم توجيهك إلى المصدر الأصلي أو الناشر.'
            : 'Direct download is offered only for material whose licence permits it. In all other cases you are directed to the original source or publisher.'}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 start-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-lg max-w-sm text-center">
          {toast}
        </div>
      )}

      {reporting && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1830] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'الإبلاغ عن مشكلة في الملف' : 'Report a problem with this file'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{reporting.title}</p>
              </div>
              <button onClick={() => setReporting(null)} className="p-1 text-slate-400" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {language === 'ar' ? 'نوع المشكلة' : 'Reason'}
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full mb-3 p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="copyright">{language === 'ar' ? 'انتهاك حقوق النشر' : 'Copyright infringement'}</option>
              <option value="misleading">{language === 'ar' ? 'محتوى مضلل أو غير صحيح' : 'Misleading content'}</option>
              <option value="malware">{language === 'ar' ? 'ملف ضار أو مشبوه' : 'Malicious file'}</option>
              <option value="privacy">{language === 'ar' ? 'انتهاك خصوصية' : 'Privacy violation'}</option>
              <option value="other">{language === 'ar' ? 'أخرى' : 'Other'}</option>
            </select>

            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {language === 'ar' ? 'التفاصيل' : 'Details'}
            </label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={4}
              className="w-full mb-3 p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              placeholder={language === 'ar' ? 'اشرح المشكلة واذكر أي مراجع...' : 'Describe the issue and any references...'}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setReporting(null)} className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => void submitReport()}
                disabled={reportBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {reportBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {language === 'ar' ? 'إرسال البلاغ' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
