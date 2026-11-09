/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { NavigationView } from '../../types/index.ts';
import { BrandLogo } from '../brand/BrandLogo.tsx';
import { ShieldCheck, Globe, BookOpen, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: NavigationView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { isPrivileged } = useAuth();

  return (
    <footer className="w-full bg-slate-900 text-slate-300 dark:bg-[#050b16] dark:text-slate-400 border-t border-slate-800 transition-colors duration-200 mt-auto">
      {/* Upper Footer: Value Proposition & Academic Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Column 1: Brand & Official Mission */}
          <div className="md:col-span-2 space-y-4">
            <BrandLogo size="md" showText={true} showTagline={true} />
            
            <p className="text-sm text-slate-400 dark:text-slate-400 leading-relaxed max-w-lg mt-3">
              {t.brand.brandDescription}
            </p>

            {/* Version 1.0 Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/50 text-blue-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{t.footer.yemenFirstBadge}</span>
            </div>

            {/* Transparent Verification Pledge */}
            <div className="p-3.5 rounded-lg bg-slate-800/60 dark:bg-slate-900/60 border border-slate-700/60 text-xs text-slate-300 dark:text-slate-400 leading-normal flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{t.barometer.transparencyNote}</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase font-mono">
              {language === 'ar' ? 'أقسام المنصة' : 'Platform Directory'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('universities')}
                  className="hover:text-amber-400 transition-colors"
                >
                  {t.nav.universities}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('curricula')}
                  className="hover:text-amber-400 transition-colors"
                >
                  {t.nav.curricula}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('courses')}
                  className="hover:text-amber-400 transition-colors"
                >
                  {t.nav.courses}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('library')}
                  className="hover:text-amber-400 transition-colors"
                >
                  {t.nav.library}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('search')}
                  className="hover:text-amber-400 transition-colors"
                >
                  {t.nav.search}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Roadmap & Legal */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase font-mono">
              {language === 'ar' ? 'الحوكمة والتوسع' : 'Governance & Roadmap'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-1.5 text-slate-300">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">{t.brand.version2Title}</span>
              </li>
              {isPrivileged && (
                <li>
                  <button
                    onClick={() => onNavigate('admin')}
                    className="hover:text-amber-400 transition-colors flex items-center gap-1"
                  >
                    <span>{t.nav.admin}</span>
                    <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      RBAC
                    </span>
                  </button>
                </li>
              )}
              <li className="text-xs text-slate-400 pt-2">
                {t.footer.reservedNotice}
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Sub-Footer: Copyright */}
      <div className="border-t border-slate-800 bg-slate-950/80 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            {t.footer.copyright} · {t.brand.motto}
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">{t.footer.privacyPolicy}</span>
            <span>·</span>
            <span className="hover:text-slate-400 cursor-pointer">{t.footer.termsOfService}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
