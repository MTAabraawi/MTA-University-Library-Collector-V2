/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Coverage panel. Every figure is computed from live database counts; no
 * illustrative or simulated statistics are shown.
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api, DatabaseTelemetryAPI, UniversityRecordAPI } from '../../services/api.ts';
import { Activity, Building2, GraduationCap, BookOpen, Library, Users, ShieldCheck, AlertCircle } from 'lucide-react';

const VERIFICATION_BUCKETS = [
  { key: 'verified_complete', ar: 'موثقة ومحققة', en: 'Verified', color: 'bg-emerald-500' },
  { key: 'partially_verified', ar: 'موثقة جزئياً', en: 'Partially verified', color: 'bg-cyan-500' },
  { key: 'under_verification', ar: 'قيد التدقيق', en: 'Under verification', color: 'bg-amber-500' },
  { key: 'needs_update', ar: 'تحتاج تحديثاً', en: 'Needs update', color: 'bg-orange-500' },
  { key: 'unverified', ar: 'غير مؤكدة', en: 'Unverified', color: 'bg-slate-400' },
];

export const CoverageBarometer: React.FC = () => {
  const { language } = useLanguage();
  const [telemetry, setTelemetry] = useState<DatabaseTelemetryAPI | null>(null);
  const [institutions, setInstitutions] = useState<UniversityRecordAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getTelemetry(), api.getInstitutions()])
      .then(([telemetryRes, directoryRes]) => {
        setTelemetry(telemetryRes.telemetry);
        setInstitutions(directoryRes.institutions || []);
      })
      .catch(() => {
        setTelemetry(null);
        setInstitutions([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const counts = VERIFICATION_BUCKETS.map((bucket) => ({
    ...bucket,
    count: institutions.filter((inst) => inst.generalVerificationStatus === bucket.key).length,
  }));
  const total = institutions.length;

  const metrics = [
    {
      icon: Building2,
      label: language === 'ar' ? 'المؤسسات المسجلة' : 'Institutions recorded',
      value: telemetry?.totalInstitutions ?? total,
      tone: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: GraduationCap,
      label: language === 'ar' ? 'البرامج الأكاديمية' : 'Academic programs',
      value: telemetry?.totalPrograms ?? 0,
      tone: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      icon: BookOpen,
      label: language === 'ar' ? 'المقررات الدراسية' : 'Courses',
      value: telemetry?.totalCourses ?? 0,
      tone: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      icon: Library,
      label: language === 'ar' ? 'المراجع الأكاديمية' : 'Academic references',
      value: telemetry?.totalReferences ?? 0,
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: Users,
      label: language === 'ar' ? 'المستخدمون المسجلون' : 'Registered users',
      value: telemetry?.registeredUsers ?? 0,
      tone: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <section className="py-12 md:py-16 bg-white dark:bg-[#091224] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono mb-1">
              <Activity className="w-4 h-4" />
              <span>{language === 'ar' ? 'شفافية البيانات' : 'Data transparency'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'حالة قاعدة البيانات والتوثيق' : 'Database & verification status'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {language === 'ar'
                ? 'جميع الأرقام أدناه محسوبة من السجلات الحالية. لا تُعرض إحصاءات تقديرية أو محاكاة.'
                : 'All figures below are computed from current records. No estimated or simulated statistics are displayed.'}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 self-start md:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            {telemetry?.databaseEngine || 'SQLite'}
            <span className="text-slate-300 dark:text-slate-700">•</span>
            {language === 'ar' ? 'إعلانات معطلة افتراضياً' : 'Ads disabled by default'}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800"
                  >
                    <Icon className={`w-5 h-5 ${metric.tone} mb-2`} />
                    <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                      {Number(metric.value).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-GB')}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{metric.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-5 rounded-2xl bg-slate-50 dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'توزيع حالة التوثيق المؤسسي' : 'Institutional verification distribution'}
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {language === 'ar' ? `الإجمالي: ${total}` : `Total: ${total}`}
                </span>
              </div>

              {total === 0 ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  {language === 'ar'
                    ? 'لا توجد مؤسسات مسجلة بعد، لذلك لا يمكن حساب نسب التوثيق.'
                    : 'No institutions are recorded yet, so verification ratios cannot be computed.'}
                </div>
              ) : (
                <>
                  <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
                    {counts.map((bucket) => (
                      <div
                        key={bucket.key}
                        className={bucket.color}
                        style={{ width: `${(bucket.count / total) * 100}%` }}
                        title={`${language === 'ar' ? bucket.ar : bucket.en}: ${bucket.count}`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    {counts.map((bucket) => (
                      <div key={bucket.key} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${bucket.color}`} />
                        <span>{language === 'ar' ? bucket.ar : bucket.en}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{bucket.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-3">
                {language === 'ar'
                  ? 'غياب الدليل يعني «غير موثق» وليس رفضاً أو نفياً لوجود المؤسسة. تُراجع السجلات دورياً ويُسجل تاريخ كل تدقيق.'
                  : 'Missing evidence means "not documented", not a rejection or a denial of the institution\'s existence. Records are reviewed periodically and each audit date is stored.'}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
