/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { NavigationView } from '../../types/index.ts';
import { api, DatabaseTelemetryAPI } from '../../services/api.ts';
import { BrandLogo } from '../brand/BrandLogo.tsx';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Library,
  ShieldCheck,
  BookOpen,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface HeroSectionProps {
  onNavigate: (view: NavigationView) => void;
  onSearchSubmit: (query: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, onSearchSubmit }) => {
  const { t, language, direction } = useLanguage();
  const [query, setQuery] = useState('');
  const [telemetry, setTelemetry] = useState<DatabaseTelemetryAPI | null>(null);

  useEffect(() => {
    api
      .getTelemetry()
      .then((res) => setTelemetry(res.telemetry))
      .catch(() => setTelemetry(null));
  }, []);

  const stats = telemetry
    ? [
        { label: language === 'ar' ? 'مؤسسة مسجلة' : 'Institutions', value: telemetry.totalInstitutions },
        { label: language === 'ar' ? 'برنامج أكاديمي' : 'Programs', value: telemetry.totalPrograms },
        { label: language === 'ar' ? 'مقرر دراسي' : 'Courses', value: telemetry.totalCourses },
        { label: language === 'ar' ? 'مرجع أكاديمي' : 'References', value: telemetry.totalReferences },
      ].filter((item) => typeof item.value === 'number')
    : [];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#071a33] via-[#0b2a52] to-[#0a1c38] dark:from-[#040b16] dark:via-[#071a33] dark:to-[#040b16] text-white">
      <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>
      <div className="absolute -top-32 -end-32 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-40 -start-24 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold tracking-wide text-blue-100 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>MTA TECHNOLOGIES</span>
            <span className="text-white/30">•</span>
            <span>{language === 'ar' ? 'الإصدار 1.0 — اليمن أولاً' : 'Version 1.0 — Yemen First'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.15] tracking-tight">
            {language === 'ar' ? (
              <>
                بوابتك الأكاديمية إلى{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-200">
                  الجامعات والمناهج والمراجع
                </span>
              </>
            ) : (
              <>
                Your academic gateway to{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-200">
                  universities, curricula and references
                </span>
              </>
            )}
          </h1>

          <p className="mt-4 text-sm sm:text-base text-blue-100/85 leading-relaxed max-w-2xl">
            {language === 'ar'
              ? 'دليل أكاديمي مستقل للمؤسسات اليمنية، مع خطط دراسية ومكتبة مراجع رقمية. كل معلومة مرتبطة بمصدرها وحالة التوثيق، ولا تُفترض تراخيص أو اعتمادات دون دليل.'
              : 'An independent academic directory of Yemeni institutions, with study plans and a digital reference library. Every record carries its source and verification status; licences and accreditations are never assumed.'}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit(query);
            }}
            className="mt-7 max-w-2xl"
            role="search"
          >
            <div className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-2xl bg-white/95 dark:bg-white/10 backdrop-blur border border-white/20 shadow-xl">
              <div className="flex items-center flex-1 px-3 gap-2 min-w-0">
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-200 shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? 'ابحث عن جامعة، تخصص، مقرر، أو مرجع...'
                      : 'Search a university, program, course or reference...'
                  }
                  className="w-full py-3 bg-transparent text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-300 outline-none text-sm"
                  aria-label={language === 'ar' ? 'البحث الأكاديمي' : 'Academic search'}
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shrink-0"
              >
                <span>{language === 'ar' ? 'بحث' : 'Search'}</span>
                {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('universities')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-blue-50 transition-colors"
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              {language === 'ar' ? 'استكشف دليل الجامعات' : 'Explore the directory'}
            </button>
            <button
              onClick={() => onNavigate('library')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
            >
              <Library className="w-4 h-4 text-cyan-200" />
              {language === 'ar' ? 'المكتبة الأكاديمية' : 'Academic library'}
            </button>
          </div>

          {stats.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/15">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-xl font-extrabold font-mono text-white">
                      {Number(stat.value).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-GB')}
                    </div>
                    <div className="text-[11px] text-blue-200/80">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-blue-200/60">
                {language === 'ar' ? 'أرقام مباشرة من قاعدة بيانات المنصة' : 'Live counts from the platform database'}
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
          {[
            {
              icon: ShieldCheck,
              title: language === 'ar' ? 'توثيق صريح' : 'Explicit provenance',
              text: language === 'ar' ? 'ترخيص واعتماد منفصلان، مع مصدر وتاريخ تدقيق لكل سجل.' : 'Licensing and accreditation kept separate, each with a source and audit date.',
            },
            {
              icon: BookOpen,
              title: language === 'ar' ? 'محتوى موثق فقط' : 'Documented content only',
              text: language === 'ar' ? 'لا تُفبرك جامعات أو مناهج أو مقررات؛ الفجوات تظهر كما هي.' : 'No invented universities, curricula or courses; gaps remain visible.',
            },
            {
              icon: CheckCircle2,
              title: language === 'ar' ? 'مراجعة بشرية' : 'Human moderation',
              text: language === 'ar' ? 'كل ملف مرفوع يمر بفحص أمني ومراجعة أكاديمية قبل النشر.' : 'Every uploaded file passes security screening and academic review before publishing.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl bg-white/[0.06] border border-white/10 p-4">
                <Icon className="w-5 h-5 text-cyan-200 mb-2" />
                <div className="text-sm font-bold text-white">{item.title}</div>
                <div className="text-[11px] text-blue-100/70 mt-1 leading-relaxed">{item.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
