/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { initializeAppServices } from './services/monetization.ts';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NavigationView } from './types/index.ts';
import { TopBar } from './components/navigation/TopBar.tsx';
import { Footer } from './components/navigation/Footer.tsx';
import { PrivacySettingsModal } from './components/privacy/PrivacySettingsModal.tsx';
import { HeroSection } from './components/home/HeroSection.tsx';
import { CoverageBarometer } from './components/home/CoverageBarometer.tsx';
import { FeaturedDirectorySection } from './components/home/FeaturedDirectorySection.tsx';
import { AcademicDisciplinesSection } from './components/home/AcademicDisciplinesSection.tsx';
import { AcademicLibrarySection } from './components/home/AcademicLibrarySection.tsx';
import { UniversitiesView } from './components/views/UniversitiesView.tsx';
import { CurriculaView } from './components/views/CurriculaView.tsx';
import { CoursesView } from './components/views/CoursesView.tsx';
import { LibraryView } from './components/views/LibraryView.tsx';
import { ExternalLibrariesView } from './components/views/ExternalLibrariesView.tsx';
import { SearchView } from './components/views/SearchView.tsx';
import { SavedItemsView } from './components/views/SavedItemsView.tsx';
import { AdminView } from './components/views/AdminView.tsx';
import { QuickSearchModal } from './components/search/QuickSearchModal.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { AccountModal } from './components/auth/AccountModal.tsx';
import { DocumentUploadModal } from './components/upload/DocumentUploadModal.tsx';
import { api } from './services/api.ts';
import { ShieldCheck, LogIn, Loader2 } from 'lucide-react';

function AccessDenied({ onSignIn, onBack }: { onSignIn: () => void; onBack: () => void }) {
  const { language } = useLanguage();
  return (
    <div className="py-20 bg-slate-50 dark:bg-[#070e1c] min-h-[60vh] transition-colors">
      <div className="max-w-xl mx-auto px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          {language === 'ar' ? 'هذه الصفحة مخصصة للموظفين المخوّلين' : 'Staff access only'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          {language === 'ar'
            ? 'تتطلب لوحة الإدارة دور مدير أو محرر أو مدقق أكاديمي. يتم فرض الصلاحيات على الخادم وليس في الواجهة فقط.'
            : 'The administration console requires an administrator, content editor, or academic reviewer role. Permissions are enforced on the server, not only in the interface.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={onSignIn}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            <LogIn className="w-4 h-4" />
            {language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
          >
            {language === 'ar' ? 'العودة للرئيسية' : 'Back to home'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const { language } = useLanguage();
  const { isPrivileged, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<NavigationView>('home');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPrivacySettingsOpen, setIsPrivacySettingsOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [institutions, setInstitutions] = useState<Array<{ id: number; nameAr: string; nameEn: string }>>([]);

  React.useEffect(() => {
    api.getInstitutions()
      .then((data) => {
        if (data?.institutions) {
          setInstitutions(data.institutions.map((inst) => ({
            id: inst.id,
            nameAr: inst.nameAr,
            nameEn: inst.nameEn,
          })));
        }
      })
      .catch(() => {
        // Upload modal still works without the optional institution list.
      });
  }, []);

  const handleNavigate = (view: NavigationView, query?: string) => {
    if (query) {
      setSearchInitialQuery(query);
      setCurrentView('search');
    } else {
      setCurrentView(view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHeroSearchSubmit = (query: string) => {
    setSearchInitialQuery(query);
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAccount = () => {
    if (isLoading) return;
    setIsAccountModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#070e1c] dark:text-slate-100 transition-colors duration-200">
      <TopBar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenAccount={openAccount}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
      />

      <main className="flex-1">
        {currentView === 'home' && (
          <>
            <HeroSection onNavigate={handleNavigate} onSearchSubmit={handleHeroSearchSubmit} />
            <CoverageBarometer />
            <FeaturedDirectorySection onNavigate={handleNavigate} onOpenAuth={() => setIsAuthModalOpen(true)} />
            <AcademicDisciplinesSection onNavigate={handleNavigate} />
            <AcademicLibrarySection onNavigate={handleNavigate} onOpenAuth={() => setIsAuthModalOpen(true)} />
          </>
        )}

        {currentView === 'universities' && <UniversitiesView onOpenAuth={() => setIsAuthModalOpen(true)} />}
        {currentView === 'programs' && <CurriculaView />}
        {currentView === 'curricula' && <CurriculaView />}
        {currentView === 'courses' && <CoursesView onOpenAuth={() => setIsAuthModalOpen(true)} />}
        {currentView === 'library' && <LibraryView onOpenAuth={() => setIsAuthModalOpen(true)} />}
{currentView === 'external-libraries' && <ExternalLibrariesView />}
        {currentView === 'search' && (
          <SearchView initialQuery={searchInitialQuery} onNavigate={handleNavigate} />
        )}
        {currentView === 'saved' && <SavedItemsView onNavigate={handleNavigate} onOpenAuth={() => setIsAuthModalOpen(true)} />}
        {currentView === 'admin' && (
          isLoading ? (
            <div className="py-24 flex items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {language === 'ar' ? 'جارٍ التحقق من الصلاحيات...' : 'Checking permissions...'}
            </div>
          ) : isPrivileged ? (
            <AdminView />
          ) : (
            <AccessDenied onSignIn={() => setIsAuthModalOpen(true)} onBack={() => handleNavigate('home')} />
          )
        )}
      </main>

      <Footer onNavigate={handleNavigate} onOpenPrivacySettings={() => setIsPrivacySettingsOpen(true)} />

      <PrivacySettingsModal isOpen={isPrivacySettingsOpen} onClose={() => setIsPrivacySettingsOpen(false)} />
      <QuickSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigate={handleNavigate}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setIsAuthModalOpen(false)}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        institutions={institutions}
        onUploadSuccess={() => undefined}
      />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    void initializeAppServices();
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
