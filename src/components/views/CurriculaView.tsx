/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Study-plan explorer backed by /api/academic/programs and study-plans.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api, AcademicProgramAPI, StudyPlanAPI, StudyPlanSemesterAPI } from '../../services/api.ts';
import { EmptyState, ErrorState, LoadingState, statusTone } from '../common/StateBlocks.tsx';
import {
  Layers,
  BookOpen,
  GraduationCap,
  History,
  ShieldCheck,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Search,
  Link2,
  Info,
} from 'lucide-react';

const ACCREDITATION_LABELS: Record<string, { ar: string; en: string }> = {
  programmatically_accredited: { ar: 'معتمد برامجياً', en: 'Programmatically Accredited' },
  accreditation_under_verification: { ar: 'الاعتماد قيد التحقق', en: 'Accreditation Under Verification' },
  candidate_status: { ar: 'مرشح للاعتماد', en: 'Accreditation Candidate' },
  partially_verified: { ar: 'معتمد جزئياً', en: 'Partially Verified' },
  not_documented: { ar: 'الاعتماد غير موثق', en: 'Accreditation Not Documented' },
  unknown: { ar: 'حالة الاعتماد غير محددة', en: 'Accreditation Unknown' },
  not_accredited: { ar: 'غير معتمد برامجياً', en: 'Not Accredited' },
};

const labelOf = (map: Record<string, { ar: string; en: string }>, key: string, language: 'ar' | 'en') =>
  map[key]?.[language] || key;

export const CurriculaView: React.FC = () => {
  const { language } = useLanguage();
  const [programs, setPrograms] = useState<AcademicProgramAPI[]>([]);
  const [query, setQuery] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [plans, setPlans] = useState<StudyPlanAPI[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlanAPI | null>(null);
  const [semesters, setSemesters] = useState<StudyPlanSemesterAPI[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [error, setError] = useState('');
  const [planError, setPlanError] = useState('');

  const loadPrograms = useCallback(async () => {
    setIsLoadingPrograms(true);
    setError('');
    try {
      const res = await api.getPrograms({ q: query });
      setPrograms(res.programs || []);
      if ((res.programs || []).length > 0) {
        setSelectedProgramId((prev) =>
          prev && res.programs.some((p) => p.id === prev) ? prev : res.programs[0].id,
        );
      } else {
        setSelectedProgramId(null);
      }
    } catch (err) {
      setError(
        language === 'ar'
          ? `تعذّر تحميل البرامج: ${(err as Error).message}`
          : `Unable to load programs: ${(err as Error).message}`,
      );
      setPrograms([]);
    } finally {
      setIsLoadingPrograms(false);
    }
  }, [query, language]);

  useEffect(() => {
    const timer = setTimeout(loadPrograms, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadPrograms, query]);

  useEffect(() => {
    if (!selectedProgramId) {
      setPlans([]);
      setActivePlan(null);
      setSemesters([]);
      return;
    }
    let cancelled = false;
    setIsLoadingPlan(true);
    setPlanError('');
    api
      .getStudyPlan(selectedProgramId)
      .then((res) => {
        if (cancelled) return;
        setPlans(res.plans || []);
        setActivePlan(res.activePlan || (res.plans || [])[0] || null);
        setSemesters(res.semesters || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setPlanError((err as Error).message);
        setPlans([]);
        setActivePlan(null);
        setSemesters([]);
      })
      .finally(() => !cancelled && setIsLoadingPlan(false));
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId]);

  const currentProgram = programs.find((p) => p.id === selectedProgramId) || null;

  return (
    <div className="py-8 md:py-12 bg-slate-50 dark:bg-[#070e1c] min-h-[70vh] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono mb-1">
            <Layers className="w-4 h-4" />
            <span>{language === 'ar' ? 'الخطط والمناهج' : 'Curricula & Study Plans'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            {language === 'ar' ? 'مستكشف الخطط الدراسية' : 'Study Plans Explorer'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
            {language === 'ar'
              ? 'خطط دراسية موثقة فصلاً بفصل، بإصداراتها التاريخية والساعات المعتمدة. تُعرض الخطة كما اعتمدتها المؤسسة، ولا تُستكمل الفجوات بالتخمين.'
              : 'Documented semester-by-semester study plans with historical versions and credit totals. Plans are shown as approved by the institution; gaps are never filled by inference.'}
          </p>
        </div>

        {isLoadingPrograms ? (
          <LoadingState label={language === 'ar' ? 'جارٍ تحميل البرامج...' : 'Loading programs...'} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadPrograms} />
        ) : programs.length === 0 ? (
          <EmptyState
            title={language === 'ar' ? 'لا توجد برامج أكاديمية مسجلة' : 'No academic programs recorded'}
            description={
              language === 'ar'
                ? 'لم تُسجل بعد برامج أو خطط دراسية في قاعدة البيانات. تُستورد الخطط الرسمية عبر لوحة الإدارة في مرحلة التوثيق.'
                : 'No programs or study plans are recorded yet. Official plans are ingested through the administration console during verification.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث عن برنامج...' : 'Search programs...'}
                  className="w-full ps-9 pe-3 py-2 text-xs bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  aria-label={language === 'ar' ? 'بحث البرامج' : 'Search programs'}
                />
              </div>

              {programs.map((prog) => {
                const isSelected = prog.id === selectedProgramId;
                return (
                  <button
                    key={prog.id}
                    onClick={() => setSelectedProgramId(prog.id)}
                    className={`w-full text-start p-4 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-white dark:bg-[#0c1830] border-blue-600 dark:border-blue-500 shadow-md ring-1 ring-blue-500/20'
                        : 'bg-white/60 dark:bg-[#0c1830]/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-mono">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{prog.degreeLevel}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border ${statusTone(prog.programmaticAccreditation)}`}>
                        {labelOf(ACCREDITATION_LABELS, prog.programmaticAccreditation, language)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 leading-snug">
                      {language === 'ar' ? prog.nameAr : prog.nameEn}
                    </h3>
                    <div className="text-[11px] text-slate-500">
                      {prog.durationYears} {language === 'ar' ? 'سنوات' : 'years'} · {prog.totalCredits}{' '}
                      {language === 'ar' ? 'ساعة معتمدة' : 'credits'}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{prog.verificationStatus || 'unverified'}</span>
                      {language === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </aside>

            <section className="lg:col-span-8 space-y-6">
              {currentProgram && (
                <div className="p-6 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          {currentProgram.degreeLevel}
                        </span>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${statusTone(currentProgram.programmaticAccreditation)}`}>
                          {labelOf(ACCREDITATION_LABELS, currentProgram.programmaticAccreditation, language)}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                        {language === 'ar' ? currentProgram.nameAr : currentProgram.nameEn}
                      </h2>
                      {currentProgram.programmaticAuthorityAr && (
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          {language === 'ar'
                            ? currentProgram.programmaticAuthorityAr
                            : currentProgram.programmaticAuthorityEn}
                        </p>
                      )}
                    </div>

                    {plans.length > 0 && (
                      <div className="shrink-0 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                          <History className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-semibold">{language === 'ar' ? 'إصدار الخطة' : 'Plan version'}</span>
                        </div>
                        <select
                          value={activePlan?.id || ''}
                          onChange={(e) => {
                            const plan = plans.find((p) => p.id === Number(e.target.value)) || null;
                            setActivePlan(plan);
                          }}
                          className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 font-medium text-slate-900 dark:text-white outline-none"
                        >
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {language === 'ar' ? plan.versionNameAr : plan.versionNameEn} ({plan.versionYear})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 text-center font-mono">
                    <div>
                      <div className="text-[11px] text-slate-400">{language === 'ar' ? 'الخطة النشطة' : 'Active plan'}</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {activePlan ? activePlan.versionYear : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">{language === 'ar' ? 'الساعات' : 'Credits'}</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {activePlan?.totalCredits ?? currentProgram.totalCredits}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">{language === 'ar' ? 'الفصول' : 'Semesters'}</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {activePlan?.totalSemesters ?? semesters.length}
                      </div>
                    </div>
                  </div>

                  {(activePlan?.approvalDecree || currentProgram.sourceUrl) && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      {activePlan?.approvalDecree && (
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          {activePlan.approvalDecree}
                        </span>
                      )}
                      {currentProgram.sourceUrl && (
                        <a
                          href={currentProgram.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Link2 className="w-3.5 h-3.5" /> {language === 'ar' ? 'مصدر البرنامج' : 'Program source'}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isLoadingPlan ? (
                <LoadingState compact label={language === 'ar' ? 'جارٍ تحميل الخطة...' : 'Loading study plan...'} />
              ) : planError ? (
                <ErrorState message={planError} />
              ) : semesters.length === 0 ? (
                <EmptyState
                  title={language === 'ar' ? 'لا توجد خطة دراسية موثقة' : 'No documented study plan'}
                  description={
                    language === 'ar'
                      ? 'هذا البرنامج مسجل، لكن فصوله ومقرراته لم تُوثق بعد. لا تُعرض خطة افتراضية.'
                      : 'This program is recorded, but its semesters and courses have not been documented yet. No default plan is displayed.'
                  }
                />
              ) : (
                <div className="space-y-6">
                  {semesters.map((semester) => (
                    <div
                      key={semester.id}
                      className="rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                      <div className="px-5 py-3.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>
                            {language === 'ar' ? semester.nameAr : semester.nameEn} —{' '}
                            {language === 'ar' ? `الفصل ${semester.semesterNumber}` : `Semester ${semester.semesterNumber}`}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                          {semester.minCredits}–{semester.maxCredits} {language === 'ar' ? 'ساعة' : 'credits'}
                        </div>
                      </div>

                      {semester.courses.length === 0 ? (
                        <div className="p-5 text-xs text-slate-500 italic flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          {language === 'ar' ? 'لا مقررات مسجلة لهذا الفصل' : 'No courses recorded for this semester'}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {semester.courses.map((course) => (
                            <div key={course.id} className="p-4 sm:px-5 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {course.code}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                    {language === 'ar' ? course.titleAr : course.titleEn}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {language === 'ar' ? course.disciplineAr : course.disciplineEn}
                                  {(course.prerequisites || []).length > 0 && (
                                    <> · {language === 'ar' ? 'متطلب سابق: ' : 'Prerequisite: '}{course.prerequisites!.join(', ')}</>
                                  )}
                                </div>
                              </div>
                              <div className="text-end shrink-0">
                                <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">{course.credits}</div>
                                <div className="text-[10px] text-slate-400">{language === 'ar' ? 'ساعة' : 'cr'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {currentProgram && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <GraduationCap className="w-4 h-4" />
                  {language === 'ar'
                    ? 'البرنامج مرتبط بكلية وقسم محددين في السجل المؤسسي.'
                    : 'The program is linked to a specific faculty and department in the institutional record.'}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
