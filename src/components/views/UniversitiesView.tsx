/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public academic directory. Every record shown comes from the database; no
 * demonstration institutions are injected when the database is empty.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, UniversityRecordAPI, AcademicProgramAPI } from '../../services/api.ts';
import { EmptyState, ErrorState, LoadingState, statusTone } from '../common/StateBlocks.tsx';
import {
  Building2,
  MapPin,
  Calendar,
  ShieldCheck,
  Search,
  ExternalLink,
  Bookmark,
  CheckCircle2,
  Clock,
  HelpCircle,
  X,
  Layers,
  GraduationCap,
  Mail,
  Phone,
  FileText,
  Loader2,
} from 'lucide-react';

interface UniversitiesViewProps {
  onOpenAuth?: () => void;
}

const SECTOR_LABELS: Record<string, { ar: string; en: string }> = {
  public: { ar: 'جامعة حكومية', en: 'Public University' },
  private: { ar: 'جامعة أهلية / خاصة', en: 'Private University' },
  community_college: { ar: 'كلية مجتمع', en: 'Community College' },
  independent_college: { ar: 'كلية جامعية مستقلة', en: 'Independent College' },
  affiliated_college: { ar: 'كلية تابعة لجامعة', en: 'Affiliated College' },
  specialized_institute: { ar: 'معهد أكاديمي متخصص', en: 'Specialized Institute' },
};

const LICENSING_LABELS: Record<string, { ar: string; en: string }> = {
  officially_licensed: { ar: 'مرخّصة رسمياً', en: 'Officially Licensed' },
  license_under_verification: { ar: 'الترخيص قيد التحقق', en: 'Licensing Under Verification' },
  partially_verified: { ar: 'مرخّصة جزئياً', en: 'Partially Verified' },
  not_documented: { ar: 'الترخيص غير موثق', en: 'Licensing Not Documented' },
  unknown: { ar: 'حالة الترخيص غير محددة', en: 'Licensing Unknown' },
  unlicensed: { ar: 'غير مرخّصة رسمياً', en: 'Unlicensed' },
  suspended: { ar: 'الترخيص معلّق', en: 'License Suspended' },
  revoked: { ar: 'الترخيص مسحوب', en: 'License Revoked' },
};

const ACCREDITATION_LABELS: Record<string, { ar: string; en: string }> = {
  institutionally_accredited: { ar: 'معتمدة مؤسسياً', en: 'Institutionally Accredited' },
  accreditation_under_verification: { ar: 'الاعتماد قيد التحقق', en: 'Accreditation Under Verification' },
  candidate_status: { ar: 'مرشحة للاعتماد', en: 'Accreditation Candidate' },
  partially_verified: { ar: 'معتمدة جزئياً', en: 'Partially Verified' },
  not_documented: { ar: 'الاعتماد غير موثق', en: 'Accreditation Not Documented' },
  unknown: { ar: 'حالة الاعتماد غير محددة', en: 'Accreditation Unknown' },
  not_accredited: { ar: 'غير معتمدة مؤسسياً', en: 'Not Accredited' },
  suspended: { ar: 'الاعتماد معلّق', en: 'Accreditation Suspended' },
};

const VERIFICATION_LABELS: Record<string, { ar: string; en: string }> = {
  verified_complete: { ar: 'موثقة ومحققة', en: 'Verified' },
  verified: { ar: 'موثقة', en: 'Verified' },
  partially_verified: { ar: 'موثقة جزئياً', en: 'Partially Verified' },
  under_verification: { ar: 'قيد التدقيق', en: 'Under Verification' },
  unverified: { ar: 'غير مؤكدة', en: 'Unverified' },
  needs_update: { ar: 'تحتاج تحديثاً', en: 'Needs Update' },
};

const labelOf = (
  map: Record<string, { ar: string; en: string }>,
  key: string,
  language: 'ar' | 'en',
): string => map[key]?.[language] || key;

const GOVERNORATES = [
  { id: 'sanaa', ar: 'صنعاء / أمانة العاصمة', en: "Sana'a / Capital" },
  { id: 'aden', ar: 'عدن', en: 'Aden' },
  { id: 'taiz', ar: 'تعز', en: 'Taiz' },
  { id: 'hadhramaut', ar: 'حضرموت', en: 'Hadhramaut' },
  { id: 'ibb', ar: 'إب', en: 'Ibb' },
  { id: 'hodeidah', ar: 'الحديدة', en: 'Al-Hodeidah' },
  { id: 'thamar', ar: 'ذمار', en: 'Thamar' },
  { id: 'shabwah', ar: 'شبوة', en: 'Shabwah' },
  { id: 'almahrah', ar: 'المهرة', en: 'Al-Mahrah' },
  { id: 'lahj', ar: 'لحج', en: 'Lahj' },
  { id: 'abyan', ar: 'أبين', en: 'Abyan' },
  { id: 'amran', ar: 'عمران', en: 'Amran' },
  { id: 'saada', ar: 'صعدة', en: 'Saada' },
  { id: 'hajjah', ar: 'حجة', en: 'Hajjah' },
  { id: 'albayda', ar: 'البيضاء', en: 'Al-Bayda' },
  { id: 'mareb', ar: 'مأرب', en: 'Marib' },
  { id: 'aldhale', ar: 'الضالع', en: 'Al-Dhale' },
  { id: 'socotra', ar: 'سقطرى', en: 'Socotra' },
];

export const UniversitiesView: React.FC<UniversitiesViewProps> = ({ onOpenAuth }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedGovernorate, setSelectedGovernorate] = useState('all');
  const [selectedLicensing, setSelectedLicensing] = useState('all');
  const [selectedAccreditation, setSelectedAccreditation] = useState('all');
  const [institutions, setInstitutions] = useState<UniversityRecordAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<UniversityRecordAPI | null>(null);
  const [detail, setDetail] = useState<{
    faculties: any[];
    departments: any[];
    programs: AcademicProgramAPI[];
    campuses: any[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.getInstitutions({
        sector: selectedSector,
        governorate: selectedGovernorate,
        licensing: selectedLicensing,
        accreditation: selectedAccreditation,
        q: searchQuery,
      });
      setInstitutions(res.institutions || []);
    } catch (err) {
      setError(
        language === 'ar'
          ? `تعذّر تحميل دليل الجامعات: ${(err as Error).message}`
          : `Unable to load the directory: ${(err as Error).message}`,
      );
      setInstitutions([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSector, selectedGovernorate, selectedLicensing, selectedAccreditation, searchQuery, language]);

  useEffect(() => {
    const timer = setTimeout(load, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, searchQuery]);

  useEffect(() => {
    if (!user) {
      setSavedIds([]);
      return;
    }
    api
      .getSavedItems()
      .then((res) =>
        setSavedIds(
          (res.items || []).filter((item) => item.itemType === 'university').map((item) => item.itemId),
        ),
      )
      .catch(() => setSavedIds([]));
  }, [user]);

  const openDetails = async (institution: UniversityRecordAPI) => {
    setSelected(institution);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.getInstitution(institution.id);
      setDetail({
        faculties: res.faculties || [],
        departments: res.departments || [],
        programs: res.programs || [],
        campuses: res.campuses || [],
      });
    } catch {
      setDetail({ faculties: [], departments: [], programs: [], campuses: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async (institution: UniversityRecordAPI) => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    try {
      await api.saveItem('university', institution.id);
      setSavedIds((prev) => [...new Set([...prev, institution.id])]);
      setToast(language === 'ar' ? 'تم الحفظ في مكتبتك' : 'Saved to your library');
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setToast((err as Error).message);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSector('all');
    setSelectedGovernorate('all');
    setSelectedLicensing('all');
    setSelectedAccreditation('all');
  };

  const activeFilters = useMemo(
    () =>
      [selectedSector, selectedGovernorate, selectedLicensing, selectedAccreditation].filter(
        (value) => value !== 'all',
      ).length,
    [selectedSector, selectedGovernorate, selectedLicensing, selectedAccreditation],
  );

  return (
    <div className="py-8 md:py-12 bg-slate-50 dark:bg-[#070e1c] min-h-[70vh] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono mb-1">
            <Building2 className="w-4 h-4" />
            <span>{language === 'ar' ? 'الدليل الأكاديمي' : 'Academic Directory'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            {language === 'ar' ? 'دليل الجامعات والكليات في اليمن' : 'Directory of Yemeni Universities & Colleges'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
            {language === 'ar'
              ? 'سجلات مؤسسية مع حالة الترخيص والاعتماد المؤسسي منفصلة، مع مصدر كل معلومة وتاريخ جمعها وآخر تدقيق. السجلات التي لا يوجد لها دليل رسمي تظهر صراحةً كغير موثقة.'
              : 'Institutional records keep licensing and institutional accreditation strictly separate, each with its source, collection date and last verification. Records without official evidence are explicitly shown as undocumented.'}
          </p>

          <div className="mt-4 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{language === 'ar' ? 'سياسة التوثيق: ' : 'Verification policy: '}</span>
              {language === 'ar'
                ? 'لا تنشر المنصة ترخيصاً أو اعتماداً دون مرجع رسمي. عدم وجود دليل يعني «غير موثق» وليس «مرفوض».'
                : 'No licence or accreditation is asserted without an official reference. Missing evidence means "not documented", never "rejected".'}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 shadow-sm mb-8 space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'ابحث باسم الجامعة أو المحافظة...' : 'Search by institution name or governorate...'}
              className="w-full ps-10 pe-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              aria-label={language === 'ar' ? 'بحث الجامعات' : 'Search universities'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? 'القطاع الأكاديمي' : 'Sector'}
              </label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="all">{language === 'ar' ? 'جميع القطاعات' : 'All Sectors'}</option>
                {Object.entries(SECTOR_LABELS).map(([value, labels]) => (
                  <option key={value} value={value}>
                    {labels[language]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? 'المحافظة' : 'Governorate'}
              </label>
              <select
                value={selectedGovernorate}
                onChange={(e) => setSelectedGovernorate(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="all">{language === 'ar' ? 'جميع المحافظات' : 'All Governorates'}</option>
                {GOVERNORATES.map((gov) => (
                  <option key={gov.id} value={gov.id}>
                    {gov[language]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? 'حالة الترخيص' : 'Licensing Status'}
              </label>
              <select
                value={selectedLicensing}
                onChange={(e) => setSelectedLicensing(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="all">{language === 'ar' ? 'جميع حالات الترخيص' : 'All Licensing Statuses'}</option>
                {Object.entries(LICENSING_LABELS).map(([value, labels]) => (
                  <option key={value} value={value}>
                    {labels[language]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? 'حالة الاعتماد المؤسسي' : 'Institutional Accreditation'}
              </label>
              <select
                value={selectedAccreditation}
                onChange={(e) => setSelectedAccreditation(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="all">{language === 'ar' ? 'جميع حالات الاعتماد' : 'All Accreditation Statuses'}</option>
                {Object.entries(ACCREDITATION_LABELS).map(([value, labels]) => (
                  <option key={value} value={value}>
                    {labels[language]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span>{language === 'ar' ? 'النتائج:' : 'Results:'} </span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">{institutions.length}</span>
              {activeFilters > 0 && (
                <span className="ms-2 text-slate-400">({activeFilters} {language === 'ar' ? 'مرشح' : 'filters'})</span>
              )}
            </div>
            {(searchQuery || activeFilters > 0) && (
              <button onClick={resetFilters} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                {language === 'ar' ? 'إعادة تعيين المرشحات' : 'Reset all filters'}
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <LoadingState label={language === 'ar' ? 'جارٍ تحميل السجلات...' : 'Loading directory records...'} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : institutions.length === 0 ? (
          <EmptyState
            title={language === 'ar' ? 'لا توجد سجلات مطابقة' : 'No matching records'}
            description={
              language === 'ar'
                ? 'لم تُرجع قاعدة البيانات أي مؤسسة تطابق المرشحات الحالية. لا يتم توليد سجلات تجريبية بديلة.'
                : 'The database returned no institution matching the current filters. No demonstration records are substituted.'
            }
            action={
              <button onClick={resetFilters} className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">
                {language === 'ar' ? 'عرض جميع المؤسسات' : 'Show all institutions'}
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map((inst) => {
              const isSaved = savedIds.includes(inst.id);
              return (
                <article
                  key={inst.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] p-5 sm:p-6 flex flex-col justify-between hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                          {labelOf(SECTOR_LABELS, inst.sector, language)}
                        </span>
                        {inst.isDemoRecord ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80">
                            {language === 'ar' ? 'سجل تجريبي' : 'Demo Record'}
                          </span>
                        ) : (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${statusTone(inst.generalVerificationStatus)}`}>
                            {labelOf(VERIFICATION_LABELS, inst.generalVerificationStatus, language)}
                          </span>
                        )}
                      </div>
                      {inst.establishedYear ? (
                        <div className="flex items-center gap-1 text-xs text-slate-400 font-mono shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{inst.establishedYear}</span>
                        </div>
                      ) : null}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                      {language === 'ar' ? inst.nameAr : inst.nameEn}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <span>{language === 'ar' ? inst.governorateAr : inst.governorateEn}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070e1c] border border-slate-200/70 dark:border-slate-800/80 space-y-2 mb-4">
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase font-mono">
                          {language === 'ar' ? 'جهة الترخيص الحكومية' : 'Licensing authority'}
                        </div>
                        <div className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border ${statusTone(inst.licensingStatus)}`}>
                          {inst.licensingStatus === 'officially_licensed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          <span>{labelOf(LICENSING_LABELS, inst.licensingStatus, language)}</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-200/50 dark:border-slate-800" />
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase font-mono">
                          {language === 'ar' ? 'الاعتماد المؤسسي' : 'Institutional accreditation'}
                        </div>
                        <div className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border ${statusTone(inst.accreditationStatus)}`}>
                          {inst.accreditationStatus === 'institutionally_accredited' ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : inst.accreditationStatus === 'not_documented' ? (
                            <HelpCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span>{labelOf(ACCREDITATION_LABELS, inst.accreditationStatus, language)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                      <span>{inst.facultiesCount} {language === 'ar' ? 'كليات' : 'Faculties'}</span>
                      <span>·</span>
                      <span>{inst.programsCount} {language === 'ar' ? 'برامج' : 'Programs'}</span>
                    </div>

                    <div className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 space-y-0.5">
                      <div>
                        {language === 'ar' ? 'آخر تدقيق: ' : 'Last verified: '}
                        {inst.lastVerifiedAt
                          ? new Date(inst.lastVerifiedAt).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-GB')
                          : language === 'ar'
                            ? 'لم يُدقّق بعد'
                            : 'not yet verified'}
                      </div>
                      {inst.sourceUrl && (
                        <a
                          href={inst.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <FileText className="w-3 h-3" />
                          {language === 'ar' ? 'المصدر الرسمي' : 'Official source'}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {inst.websiteUrl && (
                        <a
                          href={inst.websiteUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                          <span>{language === 'ar' ? 'الموقع' : 'Website'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => void handleSave(inst)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                          isSaved
                            ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                            : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        }`}
                        aria-label={language === 'ar' ? 'حفظ' : 'Save'}
                      >
                        <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <button
                      onClick={() => void openDetails(inst)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                    >
                      {language === 'ar' ? 'التفاصيل' : 'Details'}
                    </button>
                  </div>
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

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-[#0c1830] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl my-4">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs font-mono text-blue-600 dark:text-blue-400 uppercase">
                  {labelOf(SECTOR_LABELS, selected.sector, language)}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {language === 'ar' ? selected.nameAr : selected.nameEn}
                </h2>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{language === 'ar' ? selected.governorateAr : selected.governorateEn}</span>
                  {selected.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{selected.email}</span>}
                  {selected.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone}</span>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="font-semibold text-slate-500 mb-1">{language === 'ar' ? 'الترخيص' : 'Licensing'}</div>
                  <div className="font-bold text-slate-900 dark:text-white">{labelOf(LICENSING_LABELS, selected.licensingStatus, language)}</div>
                  <div className="text-slate-500 mt-1">{language === 'ar' ? selected.licensingAuthorityAr : selected.licensingAuthorityEn}</div>
                  {selected.licensingDecreeNumber && <div className="font-mono text-[10px] mt-1">{selected.licensingDecreeNumber}</div>}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="font-semibold text-slate-500 mb-1">{language === 'ar' ? 'الاعتماد المؤسسي' : 'Accreditation'}</div>
                  <div className="font-bold text-slate-900 dark:text-white">{labelOf(ACCREDITATION_LABELS, selected.accreditationStatus, language)}</div>
                  <div className="text-slate-500 mt-1">{language === 'ar' ? selected.accreditationAuthorityAr : selected.accreditationAuthorityEn}</div>
                  {selected.accreditationCertificateNumber && <div className="font-mono text-[10px] mt-1">{selected.accreditationCertificateNumber}</div>}
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="font-bold text-slate-700 dark:text-slate-300">{language === 'ar' ? 'بيانات المصدر' : 'Provenance'}</div>
                <div>{language === 'ar' ? 'الجهة المصدرة: ' : 'Source institution: '}{selected.sourceInstitution || '—'}</div>
                <div>{language === 'ar' ? 'تاريخ الجمع: ' : 'Collected: '}{selected.collectedAt ? new Date(selected.collectedAt).toLocaleDateString() : '—'}</div>
                <div>{language === 'ar' ? 'آخر تدقيق: ' : 'Last verified: '}{selected.lastVerifiedAt ? new Date(selected.lastVerifiedAt).toLocaleDateString() : '—'}</div>
                {selected.verificationNotes && <div>{selected.verificationNotes}</div>}
                <div className="flex flex-wrap gap-3 pt-1">
                  {selected.sourceUrl && (
                    <a href={selected.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-blue-600 dark:text-blue-400 hover:underline">
                      {language === 'ar' ? 'رابط المصدر' : 'Source URL'}
                    </a>
                  )}
                  {selected.supportingDocumentationUrl && (
                    <a href={selected.supportingDocumentationUrl} target="_blank" rel="noreferrer noopener" className="text-blue-600 dark:text-blue-400 hover:underline">
                      {language === 'ar' ? 'الوثائق الثبوتية' : 'Supporting documentation'}
                    </a>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  {language === 'ar' ? 'الكليات والأقسام والبرامج' : 'Faculties, departments & programs'}
                </h3>
                {detailLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> {language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                  </div>
                ) : !detail || (detail.faculties.length === 0 && detail.programs.length === 0) ? (
                  <p className="text-xs text-slate-500 italic">
                    {language === 'ar'
                      ? 'لا توجد كليات أو برامج مسجلة لهذه المؤسسة بعد. تُضاف فقط بعد توثيقها من مصدر رسمي.'
                      : 'No faculties or programs recorded yet. They are added only after documentation from an official source.'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pe-1">
                    {detail.faculties.map((faculty) => (
                      <div key={`f-${faculty.id}`} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {language === 'ar' ? faculty.nameAr || faculty.name_ar : faculty.nameEn || faculty.name_en}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {detail.departments.filter((d) => (d.facultyId || d.faculty_id) === faculty.id).length}{' '}
                          {language === 'ar' ? 'أقسام' : 'departments'}
                        </div>
                      </div>
                    ))}
                    {detail.programs.map((program) => (
                      <div key={`p-${program.id}`} className="p-2.5 rounded-lg bg-white dark:bg-[#070e1c] border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {language === 'ar' ? program.nameAr : program.nameEn}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {program.degreeLevel} · {program.durationYears} {language === 'ar' ? 'سنوات' : 'years'} · {program.totalCredits} {language === 'ar' ? 'ساعة' : 'credits'}
                          </div>
                        </div>
                        <GraduationCap className="w-4 h-4 text-blue-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {selected.websiteUrl && (
                  <a
                    href={selected.websiteUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    {language === 'ar' ? 'الموقع الرسمي' : 'Official website'}
                  </a>
                )}
                <button
                  onClick={() => void handleSave(selected)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  {language === 'ar' ? 'حفظ في مكتبتي' : 'Save to my library'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
