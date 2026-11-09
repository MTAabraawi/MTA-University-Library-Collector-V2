/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Course catalogue backed by /api/academic/courses.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, CourseAPI } from '../../services/api.ts';
import { EmptyState, ErrorState, LoadingState } from '../common/StateBlocks.tsx';
import {
  BookOpen,
  Search,
  Bookmark,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Link2,
  ShieldQuestion,
  Loader2,
} from 'lucide-react';

interface CoursesViewProps {
  onOpenAuth?: () => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ onOpenAuth }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState('all');
  const [courses, setCourses] = useState<CourseAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [prereqInfo, setPrereqInfo] = useState<Record<number, string>>({});
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.getCourses({ q: query, discipline });
      setCourses(res.courses || []);
    } catch (err) {
      setError(
        language === 'ar'
          ? `تعذّر تحميل المقررات: ${(err as Error).message}`
          : `Unable to load courses: ${(err as Error).message}`,
      );
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, discipline, language]);

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
        setSavedIds((res.items || []).filter((i) => i.itemType === 'course').map((i) => i.itemId)),
      )
      .catch(() => setSavedIds([]));
  }, [user]);

  const disciplines = Array.from(
    new Map(
      courses
        .map((course) => [course.disciplineEn || course.disciplineAr, course] as const)
        .filter(([key]) => Boolean(key)),
    ).keys(),
  );

  const handleSave = async (course: CourseAPI) => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    try {
      await api.saveItem('course', course.id);
      setSavedIds((prev) => [...new Set([...prev, course.id])]);
      setToast(language === 'ar' ? 'تم حفظ المقرر' : 'Course saved');
    } catch (err) {
      setToast((err as Error).message);
    }
    setTimeout(() => setToast(''), 2500);
  };

  const checkPrerequisite = async (course: CourseAPI, prerequisiteCourseId: number) => {
    try {
      const res = await api.validatePrerequisite(course.id, prerequisiteCourseId);
      setPrereqInfo((prev) => ({ ...prev, [course.id]: res.message }));
    } catch (err) {
      setPrereqInfo((prev) => ({ ...prev, [course.id]: (err as Error).message }));
    }
  };

  return (
    <div className="py-8 md:py-12 bg-slate-50 dark:bg-[#070e1c] min-h-[70vh] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono mb-1">
            <BookOpen className="w-4 h-4" />
            <span>{language === 'ar' ? 'المقررات الدراسية' : 'Course Catalogue'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            {language === 'ar' ? 'المقررات والوصف الأكاديمي' : 'Courses & Academic Descriptions'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
            {language === 'ar'
              ? 'مقررات مسجلة مع الساعات المعتمدة والمتطلبات السابقة والوصف والأهداف. تُعرض المقررات كما وردت في المصدر فقط، دون استكمال أو تخمين للمحتوى.'
              : 'Recorded courses with credit hours, prerequisites, descriptions and objectives. Content is displayed only as published by its source, never invented or completed by inference.'}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 shadow-sm mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={language === 'ar' ? 'ابحث برمز المقرر أو عنوانه...' : 'Search by course code or title...'}
              className="w-full ps-10 pe-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              aria-label={language === 'ar' ? 'بحث المقررات' : 'Search courses'}
            />
          </div>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
          >
            <option value="all">{language === 'ar' ? 'جميع التخصصات' : 'All disciplines'}</option>
            {disciplines.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <LoadingState label={language === 'ar' ? 'جارٍ تحميل المقررات...' : 'Loading courses...'} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : courses.length === 0 ? (
          <EmptyState
            title={language === 'ar' ? 'لا توجد مقررات مسجلة' : 'No courses recorded'}
            description={
              language === 'ar'
                ? 'لم تُدخل بعد مقررات مطابقة في قاعدة البيانات. تُضاف المقررات من لوحة الإدارة بعد توثيقها.'
                : 'No matching course has been entered in the database yet. Courses are added from the administration console after verification.'
            }
          />
        ) : (
          <div className="space-y-3">
            {courses.map((course) => {
              const isOpen = expandedId === course.id;
              const isSaved = savedIds.includes(course.id);
              const prereqs = course.prerequisites || [];
              return (
                <article
                  key={course.id}
                  className="rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {course.code}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {course.credits} {language === 'ar' ? 'ساعة معتمدة' : 'credits'}
                          </span>
                          {course.verificationStatus && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500">
                              {course.verificationStatus}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                          {language === 'ar' ? course.titleAr : course.titleEn}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {language === 'ar' ? course.disciplineAr : course.disciplineEn}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => void handleSave(course)}
                        className={`p-2 rounded-lg transition-colors ${
                          isSaved
                            ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        }`}
                        aria-label={language === 'ar' ? 'حفظ المقرر' : 'Save course'}
                      >
                        <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => setExpandedId(isOpen ? null : course.id)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Collapse' : 'Expand'}
                      >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                        {[
                          { label: language === 'ar' ? 'محاضرات' : 'Lecture', value: course.lectureHours },
                          { label: language === 'ar' ? 'مختبر' : 'Lab', value: course.labHours },
                          { label: language === 'ar' ? 'تمارين' : 'Tutorial', value: course.tutorialHours ?? 0 },
                          { label: language === 'ar' ? 'الساعات' : 'Credits', value: course.credits },
                        ].map((item) => (
                          <div key={item.label} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-center">
                            <div className="text-[10px] text-slate-400">{item.label}</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {(course.descriptionAr || course.descriptionEn) && (
                        <div>
                          <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {language === 'ar' ? 'وصف المقرر' : 'Course description'}
                          </h4>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {language === 'ar' ? course.descriptionAr : course.descriptionEn}
                          </p>
                        </div>
                      )}

                      {((language === 'ar' ? course.objectivesAr : course.objectivesEn) || []).length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {language === 'ar' ? 'الأهداف' : 'Objectives'}
                          </h4>
                          <ul className="list-disc ms-5 space-y-0.5 text-slate-600 dark:text-slate-400">
                            {(language === 'ar' ? course.objectivesAr : course.objectivesEn)!.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {((language === 'ar' ? course.topicsAr : course.topicsEn) || []).length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {language === 'ar' ? 'المفردات' : 'Topics'}
                          </h4>
                          <ul className="list-disc ms-5 space-y-0.5 text-slate-600 dark:text-slate-400">
                            {(language === 'ar' ? course.topicsAr : course.topicsEn)!.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {language === 'ar' ? 'المتطلبات السابقة' : 'Prerequisites'}
                        </h4>
                        {prereqs.length === 0 ? (
                          <p className="text-slate-500 italic">{language === 'ar' ? 'لا متطلبات سابقة مسجلة' : 'None recorded'}</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {prereqs.map((prereq, index) => {
                              const numeric = Number(prereq);
                              return (
                                <button
                                  key={index}
                                  onClick={() => Number.isFinite(numeric) && numeric > 0 && void checkPrerequisite(course, numeric)}
                                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-950/50"
                                >
                                  {prereq}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {prereqInfo[course.id] && (
                          <p className="mt-1.5 text-[11px] text-blue-600 dark:text-blue-400">{prereqInfo[course.id]}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <ShieldQuestion className="w-3.5 h-3.5" />
                          {language === 'ar' ? 'المصدر: ' : 'Source: '}
                          {course.sourceInstitution || '—'}
                        </span>
                        {course.lastVerifiedAt && (
                          <span>
                            {language === 'ar' ? 'آخر تدقيق: ' : 'Last verified: '}
                            {new Date(course.lastVerifiedAt).toLocaleDateString()}
                          </span>
                        )}
                        {course.sourceUrl && (
                          <a
                            href={course.sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <Link2 className="w-3.5 h-3.5" /> {language === 'ar' ? 'المصدر' : 'Source'}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 start-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};
