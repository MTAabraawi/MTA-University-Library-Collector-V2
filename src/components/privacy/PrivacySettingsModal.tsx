import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { setAnalyticsConsent } from '../../services/monetization.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CONSENT_KEY = 'mta_analytics_consent';

export const PrivacySettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [choice, setChoice] = useState<'granted' | 'denied' | null>(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      return saved === 'granted' || saved === 'denied' ? saved : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!isOpen) return;
    setSaveError(false);
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      setChoice(saved === 'granted' || saved === 'denied' ? saved : null);
    } catch {
      setChoice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAr = language === 'ar';

  const saveChoice = async () => {
    setSaving(true);
    try {
      if (choice === null) return;
      await setAnalyticsConsent(choice === 'granted');
      onClose();
    } catch (error) {
      console.warn('[MTA] Privacy preference could not be saved:', error);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog" aria-modal="true"
      aria-labelledby="privacy-settings-title">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <h2 id="privacy-settings-title" className="text-xl font-bold text-slate-900 dark:text-white">
          {isAr ? 'إعدادات الخصوصية' : 'Privacy Settings'}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {isAr
            ? 'يمكن استخدام التحليلات الاختيارية لفهم كيفية استخدام المنصة وتحسين أدائها. لا نحتاج إلى هذه التحليلات لتشغيل الوظائف الأساسية للتطبيق.'
            : 'Optional analytics help us understand platform usage and improve performance. These analytics are not required for the app’s core functionality.'}
        </p>
        <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
          {isAr
            ? 'اختيارك خاص بالتحليلات فقط. موافقة الإعلانات وإعداداتها تُدار بشكل منفصل عبر Google UMP.'
            : 'This choice applies only to analytics. Advertising consent is managed separately through Google UMP.'}
        </p>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <input type="radio" name="analytics-consent" checked={choice === 'granted'}
              onChange={() => setChoice('granted')} />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {isAr ? 'السماح بالتحليلات الاختيارية' : 'Allow optional analytics'}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <input type="radio" name="analytics-consent" checked={choice === 'denied'}
              onChange={() => setChoice('denied')} />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {isAr ? 'رفض التحليلات الاختيارية' : 'Reject optional analytics'}
            </span>
          </label>
        </div>

        {saveError && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {isAr
              ? 'تعذر حفظ إعداد الخصوصية أو تطبيقه. يرجى المحاولة مرة أخرى.'
              : 'Could not save or apply the privacy setting. Please try again.'}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving}
            className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200">
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="button" onClick={saveChoice} disabled={saving || choice === null}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ الاختيار' : 'Save choice')}
          </button>
        </div>
      </div>
    </div>
  );
};
