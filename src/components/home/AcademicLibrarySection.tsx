/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { NavigationView } from '../../types/index.ts';
import { api, LibraryReferenceAPI } from '../../services/api.ts';
import { BookOpen, ArrowLeft, ArrowRight, ExternalLink, Download, Library } from 'lucide-react';

interface AcademicLibrarySectionProps {
  onNavigate: (view: NavigationView) => void;
  onOpenAuth?: () => void;
}

const RESOURCE_LABELS: Record<string, { ar: string; en: string }> = {
  book: { ar: 'كتاب', en: 'Book' },
  research_paper: { ar: 'بحث علمي', en: 'Research paper' },
  dissertation: { ar: 'رسالة جامعية', en: 'Thesis' },
  thesis: { ar: 'رسالة جامعية', en: 'Thesis' },
  journal_article: { ar: 'مقالة محكمة', en: 'Journal article' },
  journal: { ar: 'دورية', en: 'Journal' },
  dictionary: { ar: 'معجم', en: 'Dictionary' },
  encyclopedia: { ar: 'موسوعة', en: 'Encyclopedia' },
  oer: { ar: 'مصدر تعليمي مفتوح', en: 'OER' },
  proceedings: { ar: 'وقائع مؤتمر', en: 'Proceedings' },
  lecture_notes: { ar: 'ملاحظات محاضرات', en: 'Lecture notes' },
};

export const AcademicLibrarySection: React.FC<AcademicLibrarySectionProps> = ({ onNavigate }) => {
  const { language, direction } = useLanguage();
  const [references, setReferences] = useState<LibraryReferenceAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getLibrary()
      .then((res) => setReferences((res.references || []).slice(0, 4)))
      .catch(() => setReferences([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section className="py-12 md:py-16 bg-white dark:bg-[#091224] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono mb-1">
              {language === 'ar' ? 'مكتبة المراجع' : 'Reference library'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'مراجع أكاديمية موثقة' : 'Documented academic references'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {language === 'ar'
                ? 'بيانات ببليوغرافية وحقوق ترخيص واضحة. التحميل المباشر متاح فقط عند وجود إذن قانوني، وإلا يُوجّهك الرابط إلى المصدر الأصلي.'
                : 'Bibliographic data with clear licence information. Direct download is available only with legal authorisation; otherwise the link goes to the original source.'}
            </p>
          </div>

          <button
            onClick={() => onNavigate('library')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 self-start sm:self-auto"
          >
            <span>{language === 'ar' ? 'تصفح المكتبة' : 'Browse the library'}</span>
            {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : references.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-slate-50 dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800">
            <Library className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {language === 'ar' ? 'لا توجد مراجع مسجلة بعد' : 'No references recorded yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {language === 'ar'
                ? 'تُضاف المراجع من لوحة الإدارة ببياناتها الكاملة وحقوقها. لا تُولّد بيانات نشر أو معرفات DOI تلقائياً.'
                : 'References are added from the administration console with complete metadata and rights. Publication data and DOIs are never generated automatically.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {references.map((ref) => {
              const canDownload = Boolean(ref.downloadAllowed) && Boolean(ref.localFileUrl);
              const href = canDownload ? ref.localFileUrl! : ref.originalUrl;
              return (
                <article
                  key={ref.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                        {RESOURCE_LABELS[ref.resourceType]?.[language] || ref.resourceType}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {language === 'ar' ? ref.titleAr : ref.titleEn}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{ref.authors}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {ref.publisher} · {ref.publicationYear}
                      </p>
                      <a
                        href={href}
                        target={canDownload ? undefined : '_blank'}
                        rel="noreferrer noopener"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        {...(canDownload ? { download: true } : {})}
                      >
                        {canDownload ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                        {canDownload
                          ? language === 'ar'
                            ? 'تحميل مرخّص'
                            : 'Licensed download'
                          : language === 'ar'
                            ? 'المصدر الأصلي'
                            : 'Original source'}
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
