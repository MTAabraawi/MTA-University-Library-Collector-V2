/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useAuth, roleLabel } from '../../context/AuthContext.tsx';
import { NavigationView } from '../../types/index.ts';
import { BrandLogo } from '../brand/BrandLogo.tsx';
import {
  Search,
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  User,
  ShieldCheck,
  BookOpen,
  Layers,
  Library,
  Compass,
  Bookmark,
  LogOut,
  GraduationCap,
} from 'lucide-react';

interface TopBarProps {
  currentView: NavigationView;
  onNavigate: (view: NavigationView) => void;
  onOpenSearch: () => void;
  onOpenAuthModal: () => void;
  onOpenAccount?: () => void;
  onOpenUploadModal?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onNavigate,
  onOpenSearch,
  onOpenAuthModal,
  onOpenAccount,
  onOpenUploadModal,
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, isPrivileged, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavigationView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: t.nav.home, icon: Compass },
    { id: 'universities', label: t.nav.universities, icon: GraduationCap },
    { id: 'curricula', label: t.nav.curricula, icon: Layers },
    { id: 'courses', label: t.nav.courses, icon: BookOpen },
    { id: 'library', label: t.nav.library, icon: BookOpen },
{ id: 'external-libraries', label: language === 'ar' ? 'المكتبات الخارجية' : 'External Libraries', icon: Library },
  ];

  const handleNavClick = (view: NavigationView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const handleAccountClick = () => {
    if (user && onOpenAccount) onOpenAccount();
    else onOpenAuthModal();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#070e1c]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 md:gap-8 h-16 md:h-20">
          <div className="shrink-0">
            <BrandLogo size="md" showText={true} showTagline={false} onClick={() => handleNavClick('home')} />
          </div>

          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-medium" aria-label="Primary">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                  {isActive && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={onOpenSearch}
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm"
              aria-label={t.search.quickSearch}
              title={t.search.quickSearch}
            >
              <Search className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <span className="hidden xl:inline text-xs text-slate-400 dark:text-slate-500 font-normal border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">
                ⌘K
              </span>
            </button>

            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
              aria-label={t.nav.toggleLanguage}
              title={t.nav.toggleLanguage}
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="hidden sm:inline-flex p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label={t.nav.toggleTheme}
              title={theme === 'dark' ? t.common.lightMode : t.common.darkMode}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>

            {onOpenUploadModal && (
              <button
                onClick={onOpenUploadModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700/80 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
                title={language === 'ar' ? 'رفع مرجع أو ملخص دراسي' : 'Upload Academic PDF'}
              >
                <span>{language === 'ar' ? '+ إسهام أكاديمي' : '+ Contribute PDF'}</span>
              </button>
            )}

            <button
              onClick={() => handleNavClick('saved')}
              className={`p-2 rounded-lg transition-colors hidden md:inline-flex ${
                currentView === 'saved'
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-label={t.nav.saved}
              title={t.nav.saved}
            >
              <Bookmark className="w-5 h-5" />
            </button>

            {isPrivileged && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                  currentView === 'admin'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span className="whitespace-nowrap">{t.nav.admin}</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleAccountClick}
                  className="inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors max-w-[190px]"
                  title={`${user.fullName} · ${roleLabel(user.role, language)}`}
                >
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden xl:inline truncate">{user.fullName}</span>
                </button>
                <button
                  onClick={() => void logout()}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors hidden sm:inline-flex"
                  aria-label={t.nav.signOut}
                  title={t.nav.signOut}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg shadow-sm transition-colors whitespace-nowrap"
              >
                <User className="w-4 h-4" />
                <span>{t.nav.signIn}</span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label={mobileMenuOpen ? t.nav.closeMenu : t.nav.menu}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070e1c] px-4 pt-3 pb-6 shadow-xl transition-all">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="my-2 border-t border-slate-200 dark:border-slate-800" />

            {onOpenUploadModal && (
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenUploadModal(); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition-colors"
              >
                <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'ar' ? 'رفع مرجع أو ملخص أكاديمي' : 'Contribute Academic PDF'}</span>
              </button>
            )}

            <button
              onClick={() => handleNavClick('saved')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'saved'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className="w-5 h-5 text-amber-500" />
              <span>{t.nav.saved}</span>
            </button>

            {isPrivileged && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'admin'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>{t.nav.admin}</span>
              </button>
            )}

            <div className="my-2 border-t border-slate-200 dark:border-slate-800" />

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                <span>{theme === 'dark' ? t.common.lightMode : t.common.darkMode}</span>
              </button>

              {user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setMobileMenuOpen(false); if (onOpenAccount) onOpenAccount(); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    <User className="w-4 h-4" />
                    <span>{user.fullName}</span>
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); void logout(); }}
                    className="p-2 rounded-lg text-red-600 bg-red-50 dark:bg-red-950/40"
                    aria-label={t.nav.signOut}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenAuthModal(); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
                >
                  <User className="w-4 h-4" />
                  <span>{t.nav.signIn}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
