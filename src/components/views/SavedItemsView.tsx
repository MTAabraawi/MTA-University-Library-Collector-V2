/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Personal saved items and reading lists for the signed-in user.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, SavedItemAPI, ReadingListAPI } from '../../services/api.ts';
import { EmptyState, ErrorState, LoadingState } from '../common/StateBlocks.tsx';
import {
  Bookmark,
  Building2,
  Layers,
  BookOpen,
  Trash2,
  Download,
  Plus,
  ListPlus,
  LogIn,
  Loader2,
} from 'lucide-react';
import { NavigationView } from '../../types/index.ts';

interface SavedItemsViewProps {
  onNavigate: (view: NavigationView) => void;
  onOpenAuth?: () => void;
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  university: Building2,
  program: Layers,
  course: BookOpen,
  reference: BookOpen,
  document: BookOpen,
};

export const SavedItemsView: React.FC<SavedItemsViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<SavedItemAPI[]>([]);
  const [lists, setLists] = useState<ReadingListAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const [savedRes, listsRes] = await Promise.all([api.getSavedItems(), api.getReadingLists()]);
      setItems(savedRes.items || []);
      setLists(listsRes.readingLists || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRemove = async (id: number) => {
    try {
      await api.deleteSavedItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setToast((err as Error).message);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const createList = async () => {
    if (newListName.trim().length < 2) return;
    setCreating(true);
    try {
      const res = await api.createReadingList(newListName.trim());
      setLists((prev) => [...prev, res.readingList]);
      setNewListName('');
      setToast(language === 'ar' ? 'تم إنشاء قائمة القراءة' : 'Reading list created');
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setCreating(false);
      setTimeout(() => setToast(''), 2500);
    }
  };

  const deleteList = async (id: number) => {
    try {
      await api.deleteReadingList(id);
      setLists((prev) => prev.filter((list) => list.id !== id));
    } catch (err) {
      setToast((err as Error).message);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ items, lists }, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', 'mta_my_saved_library.json');
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  if (authLoading) {
    return (
      <div className="py-8 md:py-12 bg-slate-50 dark:bg-[#070e1c] min-h-[70vh]">
        <LoadingState label={language === 'ar' ? 'جارٍ التحقق من الحساب...' : 'Checking your account...'} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-8 md:py-12 bg-slate-50 dark:bg-[#070e1c] min-h-[70vh]">
        <div className="max-w-xl mx-auto px-4 text-center py-16 bg-white dark:bg-[#0c1830] rounded-2xl border border-slate-200 dark:border-slate-800">
          <Bookmark className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {language === 'ar' ? 'سجّل الدخول لعرض محفوظاتك' : 'Sign in to view your saved items'}
          </h1>
          <p className="text-xs text-slate-500 mt-2">
            {language === 'ar'
              ? 'المحفوظات وقوائم القراءة مرتبطة بحسابك وتُحفظ على الخادم.'
              : 'Saved items and reading lists are tied to your account and stored on the server.'}
          </p>
          <button
            onClick={() => onOpenAuth?.()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            <LogIn className="w-4 h-4" />
            {language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12 bg-slate-50 dark:bg-[#070e1c] min-h-[70vh] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500 font-mono mb-1">
              <Bookmark className="w-4 h-4" />
              <span>{language === 'ar' ? 'محفوظاتي' : 'Saved Items'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {language === 'ar' ? 'مكتبتي الأكاديمية' : 'My Academic Library'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {user.fullName} · {items.length} {language === 'ar' ? 'عنصر محفوظ' : 'saved items'}
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 shadow-xs self-start sm:self-auto"
            >
              <Download className="w-4 h-4 text-blue-500" />
              <span>{language === 'ar' ? 'تصدير (JSON)' : 'Export (JSON)'}</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <LoadingState label={language === 'ar' ? 'جارٍ تحميل المحفوظات...' : 'Loading saved items...'} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {items.length === 0 ? (
                <EmptyState
                  title={language === 'ar' ? 'لا توجد عناصر محفوظة' : 'No saved items yet'}
                  description={
                    language === 'ar'
                      ? 'احفظ الجامعات والمقررات والمراجع أثناء التصفح للرجوع إليها لاحقاً.'
                      : 'Bookmark universities, courses and references while browsing to find them here later.'
                  }
                  action={
                    <button
                      onClick={() => onNavigate('universities')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {language === 'ar' ? 'تصفح الجامعات' : 'Browse universities'}
                    </button>
                  }
                />
              ) : (
                items.map((item) => {
                  const Icon = TYPE_ICON[item.itemType] || BookOpen;
                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                            {language === 'ar'
                              ? item.titleAr || item.titleEn || `${item.itemType} #${item.itemId}`
                              : item.titleEn || item.titleAr || `${item.itemType} #${item.itemId}`}
                          </h3>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {language === 'ar' ? item.subtitleAr || item.subtitleEn || '' : item.subtitleEn || item.subtitleAr || ''}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {item.itemType} · {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => void handleRemove(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors shrink-0"
                        title={language === 'ar' ? 'حذف من المحفوظات' : 'Remove from saved'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <aside className="space-y-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <ListPlus className="w-4 h-4 text-blue-500" />
                  {language === 'ar' ? 'قوائم القراءة' : 'Reading lists'}
                </h2>
                <div className="flex gap-2">
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void createList()}
                    placeholder={language === 'ar' ? 'اسم القائمة الجديدة' : 'New list name'}
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    aria-label={language === 'ar' ? 'اسم قائمة القراءة' : 'Reading list name'}
                  />
                  <button
                    onClick={() => void createList()}
                    disabled={creating || newListName.trim().length < 2}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                    aria-label={language === 'ar' ? 'إنشاء قائمة' : 'Create list'}
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {lists.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      {language === 'ar' ? 'لا توجد قوائم بعد.' : 'No reading lists yet.'}
                    </p>
                  ) : (
                    lists.map((list) => (
                      <div key={list.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{list.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {list.items?.length || 0} {language === 'ar' ? 'عنصر' : 'items'}
                            {list.isPublic ? (language === 'ar' ? ' · عامة' : ' · public') : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => void deleteList(list.id)}
                          className="p-1 text-slate-400 hover:text-red-500 shrink-0"
                          aria-label={language === 'ar' ? 'حذف القائمة' : 'Delete list'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 text-[11px] text-slate-500 leading-relaxed">
                {language === 'ar'
                  ? 'تُحفظ العناصر في قاعدة البيانات المرتبطة بحسابك، ويمكنك حذفها في أي وقت.'
                  : 'Items are stored in the database against your account and can be removed at any time.'}
              </div>
            </aside>
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
