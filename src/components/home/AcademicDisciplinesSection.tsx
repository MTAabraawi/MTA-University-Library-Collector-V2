/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { NavigationView } from '../../types/index.ts';
import { 
  Stethoscope, 
  Cpu, 
  Scale, 
  Briefcase, 
  Atom, 
  BookA, 
  Palette, 
  Sprout, 
  GraduationCap, 
  Radio, 
  Pill,
  Calculator,
  Building,
  BrainCircuit,
  Binary,
  Layers
} from 'lucide-react';

interface AcademicDisciplinesSectionProps {
  onNavigate: (view: NavigationView) => void;
}

export const AcademicDisciplinesSection: React.FC<AcademicDisciplinesSectionProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();

  const disciplineList = [
    { id: 'medicine', name: t.disciplines.medicine, icon: Stethoscope, color: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/40' },
    { id: 'engineering', name: t.disciplines.engineering, icon: Building, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40' },
    { id: 'ai', name: t.disciplines.ai, icon: BrainCircuit, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40' },
    { id: 'computerScience', name: t.disciplines.computerScience, icon: Binary, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40' },
    { id: 'pharmacy', name: t.disciplines.pharmacy, icon: Pill, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40' },
    { id: 'law', name: t.disciplines.law, icon: Scale, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40' },
    { id: 'business', name: t.disciplines.business, icon: Briefcase, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/40' },
    { id: 'accounting', name: t.disciplines.accounting, icon: Calculator, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/40' },
    { id: 'education', name: t.disciplines.education, icon: GraduationCap, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40' },
    { id: 'sciences', name: t.disciplines.sciences, icon: Atom, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40' },
    { id: 'languages', name: t.disciplines.languages, icon: BookA, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/40' },
    { id: 'media', name: t.disciplines.media, icon: Radio, color: 'text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-800/40' },
    { id: 'arts', name: t.disciplines.arts, icon: Palette, color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/40' },
    { id: 'agriculture', name: t.disciplines.agriculture, icon: Sprout, color: 'text-lime-600 bg-lime-50 dark:bg-lime-950/40 border-lime-200 dark:border-lime-800/40' },
  ];

  return (
    <section className="py-16 bg-slate-50 dark:bg-[#091224] border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono mb-1">
              {language === 'ar' ? 'التخصصات العلمية والمهنية' : 'Academic Disciplines & Fields'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'استكشف المناهج حسب التخصص' : 'Explore Curricula by Discipline'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {language === 'ar'
                ? 'تغطية متكاملة لجميع مجالات المعرفة الإنسانية والتطبيقية دون إغفال أي فرع أكاديمي.'
                : 'Comprehensive coverage across all scientific, medical, technological, and humanities disciplines.'}
            </p>
          </div>

          <button
            onClick={() => onNavigate('curricula')}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>{t.common.viewAll}</span>
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Disciplines Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {disciplineList.map((disc) => {
            const Icon = disc.icon;
            return (
              <button
                key={disc.id}
                onClick={() => onNavigate('curricula')}
                className="flex flex-col items-center text-center p-4 rounded-xl bg-white dark:bg-[#0c1830] border border-slate-200/90 dark:border-slate-800/90 shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 group"
              >
                <div className={`p-3 rounded-xl border mb-3 transition-transform group-hover:scale-110 ${disc.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {disc.name}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
