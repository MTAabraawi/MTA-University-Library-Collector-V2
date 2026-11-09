/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Quick search palette with live API results.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { api, SearchResultAPI } from '../../services/api.ts';
import { Search, X, GraduationCap, Layers, BookOpen, ExternalLink, ArrowRight, ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { NavigationView } from '../../types/index.ts';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  university: { ar: 'مؤسسة', en: 'Institution' },
  program: { ar: 'برنامج', en: 'Program' },
  course: { ar: 'مقرر', en: 'Course' },
  reference: { ar: 'مرجع', en: 'Reference' },
  document: { ar: 'ملف', en: 'File' },
};

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { language, direction } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResultAPI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onNavigate('search');
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate]);

  useEffect(() => {
    if (!isOpen || !searchTerm.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.search(searchTerm.trim());
        setResults((res.results || []).slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  if (!isOpen) return null;

  const submit = () => {
    if (!searchTerm.trim()) return;
    onNavigate('search', searchTerm.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 md:p-20"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#0c1830] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={language === 'ar' ? 'البحث السريع' : 'Quick search'}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={language === 'ar' ? 'بحث سريع في الدليل والمكتبة...' : 'Quick search the directory and library...'}
            className="w-full mx-3 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none text-base"
          />
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 me-2" />}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 max-h-96 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider font-mono">
            {searchTerm
              ? language === 'ar'
                ? 'نتائج مباشرة من قاعدة البيانات'
                : 'Live database results'
              : language === 'ar'
                ? 'اكتب للبحث'
                : 'Type to search'}
          </div>

          <div className="space-y-1">
            {results.map((item) => {
              const view = TYPE_VIEW[item.type] || 'search';
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    onNavigate(view, item.titleEn || item.titleAr);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-start text-sm hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      {item.type === 'university' && <GraduationCap className="w-4 h-4" />}
                      {item.type === 'program' && <Layers className="w-4 h-4" />}
                      {item.type === 'course' && <BookOpen className="w-4 h-4" />}
                      {item.type === 'reference' && <ExternalLink className="w-4 h-4" />}
                      {item.type === 'document' && <FileText className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {language === 'ar' ? item.titleAr : item.titleEn}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {TYPE_LABEL[item.type]?.[language] || item.type} ·{' '}
                        {language === 'ar' ? item.subtitleAr : item.subtitleEn}
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}

            {searchTerm && !isLoading && results.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-500">
                {language === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching records'}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <button onClick={submit} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            {language === 'ar' ? 'فتح البحث المتقدم' : 'Open advanced search'}
          </button>
          <span className="font-mono">ESC {language === 'ar' ? 'إغلاق' : 'close'}</span>
        </div>
      </div>
    </div>
  );
};
