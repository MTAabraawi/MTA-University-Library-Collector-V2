/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unified academic search over the live database.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api, SearchResultAPI } from '../../services/api.ts';
import { EmptyState, ErrorState, LoadingState } from '../common/StateBlocks.tsx';
import { Search, Building2, BookOpen, Layers, ExternalLink, ArrowRight, ArrowLeft, FileText } from 'lucide-react';
import { NavigationView } from '../../types/index.ts';

interface SearchViewProps {
  initialQuery?: string;
  onNavigate: (view: NavigationView, query?: string) => void;
}

const TYPE_VIEW: Record<string, NavigationView> = {
  university: 'universities',
  program: 'curricula',
  course: 'courses',
  reference: 'library',
  document: 'library',
};

const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  university: { ar: 'مؤسسة أكاديمية', en: 'Institution' },
  program: { ar: 'برنامج أكاديمي', en: 'Program' },
  course: { ar: 'مقرر دراسي', en: 'Course' },
  reference: { ar: 'مرجع أكاديمي', en: 'Reference' },
  document: { ar: 'ملف منشور', en: 'Published file' },
};

export const SearchView: React.FC<SearchViewProps> = ({ initialQuery = '', onNavigate }) => {
  const { language, direction } = useLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [filterType, setFilterType] = useState('all');
  const [results, setResults] = useState<SearchResultAPI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const runSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const res = await api.search(query.trim(), filterType);
      setResults(res.results || []);
    } catch (err) {
      setError(
        language === 'ar'
          ? `تعذّر تنفيذ البحث: ${(err as Error).message}`
          : `Search failed: ${(err as Error).message}`,
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, filterType, language]);

  useEffect(() => {
    const timer = setTimeout(() => void runSearch(), 350);
    return () => clearTimeout(timer);
  }, [runSearch]);

  const facets = [
    { id: 'all', label: language === 'ar' ? 'جميع الأقسام' : 'All categories' },
    { id: 'university', label: language === 'ar' ? 'المؤسسات' : 'Institutions' },
    { id: 'program', label: language === 'ar' ? 'البرامج' : 'Programs' },
    { id: 'course', label: language === 'ar' ? 'المقررات' : 'Courses' },
    { id: 'reference', label: language === 'ar' ? 'المراجع' : 'References' },
    { id: 'document', label: language === 'ar' ? 'الملفات' : 'Files' },
  ];

  return (
    <div className="py-8 md:py-12 bg-slate-50 dark:bg-[#070e1c] min-h-[70vh] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono mb-1">
            <Search className="w-4 h-4" />
            <span>{language === 'ar' ? 'البحث المتقدم' : 'Advanced Search'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            {language === 'ar' ? 'البحث الأكاديمي الشامل' : 'Unified Academic Search'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
            {language === 'ar'
              ? 'بحث موحد في المؤسسات والبرامج والمقررات والمراجع والملفات المنشورة، ضمن ما هو مسجل فعلياً في قاعدة البيانات.'
              : 'Unified search across institutions, programs, courses, references and published files — limited to what is actually recorded in the database.'}
          </p>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 shadow-sm mb-8 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch();
            }}
            className="relative"
          >
            <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none text-slate-400">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'ابحث عن جامعة، برنامج، مقرر، كتاب، أو معرف DOI / ISBN...'
                  : 'Search a university, program, course, book, DOI or ISBN...'
              }
              className="w-full ps-11 pe-4 py-3 text-base bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              aria-label={language === 'ar' ? 'عبارة البحث' : 'Search query'}
            />
          </form>

          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {facets.map((facet) => (
              <button
                key={facet.id}
                onClick={() => setFilterType(facet.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === facet.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                aria-pressed={filterType === facet.id}
              >
                {facet.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <LoadingState label={language === 'ar' ? 'جارٍ البحث...' : 'Searching...'} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void runSearch()} />
        ) : !hasSearched || !query.trim() ? (
          <EmptyState
            title={language === 'ar' ? 'ابدأ بكتابة كلمة بحث' : 'Start typing to search'}
            description={
              language === 'ar'
                ? 'سيتم البحث في السجلات الفعلية فقط. جرّب اسم جامعة، رمز مقرر مثل CS101، عنوان كتاب، أو معرف DOI.'
                : 'Only real records are searched. Try a university name, a course code such as CS101, a book title, or a DOI.'
            }
          />
        ) : results.length === 0 ? (
          <EmptyState
            title={language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
            description={
              language === 'ar'
                ? 'لم تطابق أي سجلات عبارة البحث هذه. جرّب كلمات أقل أو أزل تصفية القسم.'
                : 'No records matched this query. Try fewer words or clear the category filter.'
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 font-mono">
              <span>{language === 'ar' ? `النتائج (${results.length})` : `Results (${results.length})`}</span>
              <span>{language === 'ar' ? `عبارة البحث: ${query}` : `Query: ${query}`}</span>
            </div>

            {results.map((res) => {
              const view = TYPE_VIEW[res.type] || 'home';
              return (
                <button
                  key={`${res.type}-${res.id}`}
                  onClick={() => onNavigate(view, res.titleEn || res.titleAr)}
                  className="w-full text-start p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-500 dark:hover:border-blue-500/80 hover:shadow-md transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      {res.type === 'university' && <Building2 className="w-5 h-5" />}
                      {res.type === 'program' && <Layers className="w-5 h-5" />}
                      {res.type === 'course' && <BookOpen className="w-5 h-5" />}
                      {res.type === 'reference' && <ExternalLink className="w-5 h-5" />}
                      {res.type === 'document' && <FileText className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {language === 'ar' ? res.titleAr : res.titleEn}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {TYPE_LABEL[res.type]?.[language] || res.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {language === 'ar' ? res.subtitleAr : res.subtitleEn}
                      </div>
                    </div>
                  </div>

                  <div className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0">
                    {direction === 'rtl' ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
