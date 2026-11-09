/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { NavigationView } from '../../types/index.ts';
import { api, UniversityRecordAPI } from '../../services/api.ts';
import { statusTone } from '../common/StateBlocks.tsx';
import { Building2, MapPin, ArrowLeft, ArrowRight, ShieldCheck, GraduationCap } from 'lucide-react';

interface FeaturedDirectorySectionProps {
  onNavigate: (view: NavigationView) => void;
  onOpenAuth?: () => void;
}

const SECTOR_LABELS: Record<string, { ar: string; en: string }> = {
  public: { ar: 'حكومية', en: 'Public' },
  private: { ar: 'أهلية', en: 'Private' },
  community_college: { ar: 'كلية مجتمع', en: 'Community College' },
  independent_college: { ar: 'كلية مستقلة', en: 'Independent College' },
  affiliated_college: { ar: 'كلية تابعة', en: 'Affiliated College' },
  specialized_institute: { ar: 'معهد متخصص', en: 'Specialized Institute' },
};

const LICENSING_LABELS: Record<string, { ar: string; en: string }> = {
  officially_licensed: { ar: 'مرخّصة رسمياً', en: 'Officially licensed' },
  license_under_verification: { ar: 'الترخيص قيد التحقق', en: 'Licensing under verification' },
  partially_verified: { ar: 'مرخّصة جزئياً', en: 'Partially verified' },
  not_documented: { ar: 'الترخيص غير موثق', en: 'Licensing not documented' },
  unknown: { ar: 'الترخيص غير محدد', en: 'Licensing unknown' },
  unlicensed: { ar: 'غير مرخّصة', en: 'Unlicensed' },
  suspended: { ar: 'معلّقة', en: 'Suspended' },
  revoked: { ar: 'مسحوبة', en: 'Revoked' },
};

const labelOf = (map: Record<string, { ar: string; en: string }>, key: string, language: 'ar' | 'en') =>
  map[key]?.[language] || key;

export const FeaturedDirectorySection: React.FC<FeaturedDirectorySectionProps> = ({ onNavigate }) => {
  const { language, direction } = useLanguage();
  const [institutions, setInstitutions] = useState<UniversityRecordAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getInstitutions()
      .then((res) => setInstitutions((res.institutions || []).slice(0, 6)))
      .catch(() => setInstitutions([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section className="py-12 md:py-16 bg-slate-50 dark:bg-[#070e1c] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono mb-1">
              {language === 'ar' ? 'من قاعدة البيانات' : 'From the database'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'مؤسسات أكاديمية مسجلة' : 'Recorded academic institutions'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {language === 'ar'
                ? 'تُعرض السجلات كما هي مع حالة الترخيص والاعتماد المنفصلة. عدم وجود سجل لا يعني عدم وجود المؤسسة.'
                : 'Records are shown with licensing and accreditation kept separate. A missing record does not mean the institution does not exist.'}
            </p>
          </div>

          <button
            onClick={() => onNavigate('universities')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 self-start sm:self-auto"
          >
            <span>{language === 'ar' ? 'عرض الدليل كاملاً' : 'View full directory'}</span>
            {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-40 rounded-2xl bg-slate-200/60 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : institutions.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800">
            <Building2 className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {language === 'ar' ? 'لا توجد مؤسسات مسجلة بعد' : 'No institutions recorded yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {language === 'ar'
                ? 'تُضاف المؤسسات من لوحة الإدارة بعد توثيقها من مصادر رسمية. لا تُعرض سجلات تجريبية بديلة.'
                : 'Institutions are added from the administration console after documentation from official sources. No demonstration records are substituted.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {institutions.map((inst) => (
              <article
                key={inst.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {labelOf(SECTOR_LABELS, inst.sector, language)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusTone(inst.generalVerificationStatus)}`}>
                      {inst.generalVerificationStatus}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {language === 'ar' ? inst.nameAr : inst.nameEn}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    {language === 'ar' ? inst.governorateAr : inst.governorateEn}
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      {labelOf(LICENSING_LABELS, inst.licensingStatus, language)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                      {inst.facultiesCount} {language === 'ar' ? 'كلية' : 'faculties'} · {inst.programsCount}{' '}
                      {language === 'ar' ? 'برنامج' : 'programs'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('universities')}
                  className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-start text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {language === 'ar' ? 'عرض السجل والمصادر' : 'View record & sources'}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
