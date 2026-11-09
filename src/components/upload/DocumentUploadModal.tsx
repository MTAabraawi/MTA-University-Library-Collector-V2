/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, ShieldCheck, Info } from 'lucide-react';
import { api, UniversityRecordAPI } from '../../services/api.ts';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutions?: Array<{ id: number; nameAr: string; nameEn: string }>;
  onUploadSuccess?: () => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  institutions = [],
  onUploadSuccess,
}) => {
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State (14 fields required)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [publicationYear, setPublicationYear] = useState<string>('');
  const [originalSource, setOriginalSource] = useState('');
  const [categoryCode, setCategoryCode] = useState('course_summary');
  const [universityId, setUniversityId] = useState<string>('');
  const [facultyName, setFacultyName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [programName, setProgramName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [semesterNumber, setSemesterNumber] = useState<string>('1');
  const [docLanguage, setDocLanguage] = useState<'ar' | 'en'>('ar');
  const [licenseType, setLicenseType] = useState('Creative Commons CC-BY 4.0');
  const [copyrightAccepted, setCopyrightAccepted] = useState(false);

  // Submitter details (Visitors or Authenticated users)
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
      setErrorMsg(language === 'ar' ? 'الملفات المسموح برفعها يجب أن تكون بصيغة PDF فقط.' : 'Only valid PDF files are permitted.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg(language === 'ar' ? 'الحد الأقصى لحجم الملف هو 25 ميجابايت.' : 'File size cannot exceed 25 MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (!title) {
      // Auto-populate title without extension
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedFile) {
      setErrorMsg(language === 'ar' ? 'يرجى اختيار ملف PDF لرفعه.' : 'Please select a PDF file.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg(language === 'ar' ? 'عنوان الوثيقة أو المرجع مطلوب.' : 'Document title is required.');
      return;
    }

    if (!submitterName.trim() || !submitterEmail.trim()) {
      setErrorMsg(language === 'ar' ? 'الاسم والبريد الإلكتروني للمساهم مطلوبان للتواصل والتحقق.' : 'Submitter name and email are required for attribution.');
      return;
    }

    if (!copyrightAccepted) {
      setErrorMsg(language === 'ar' ? 'يجب الإقرار بملكية أو قانونية إتاحة المحتوى الأكاديمي.' : 'You must accept the legal copyright & licensing declaration.');
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('authorName', authorName.trim());
    formData.append('publicationYear', publicationYear);
    formData.append('originalSource', originalSource.trim());
    formData.append('categoryCode', categoryCode);
    formData.append('universityId', universityId);
    formData.append('facultyName', facultyName.trim());
    formData.append('departmentName', departmentName.trim());
    formData.append('programName', programName.trim());
    formData.append('courseCode', courseCode.trim());
    formData.append('semesterNumber', semesterNumber);
    formData.append('language', docLanguage);
    formData.append('licenseType', licenseType);
    formData.append('copyrightDeclarationAccepted', 'true');
    formData.append('submitterName', submitterName.trim());
    formData.append('submitterEmail', submitterEmail.trim());

    setIsSubmitting(true);
    try {
      const res = await api.uploadDocument(formData);
      setSuccessMsg(language === 'ar' 
        ? 'تم رفع الوثيقة بنجاح وإرسالها إلى مجلد الحجر الصحي الفني. ستتم مراجعتها وتدقيقها من قبل لجنة التوثيق الأكاديمي قبل نشرها.'
        : 'Document submitted successfully to secure quarantine storage. It will be reviewed by academic editors before public publication.');
      
      onUploadSuccess?.();
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#0c1830] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070e1c]">
          <div className="flex items-center gap-2.5">
            <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'إسهامات المجتمع والطلبة — رفع مرجع أو ملخص أكاديمي' : 'Community & Student Contribution — Upload Academic PDF'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' ? 'شارك الكتب المفتوحة، الملخصات، والمحاضرات لخدمة التعليم العالي' : 'Share open-access textbooks, study notes & lecture handouts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Notice */}
        <div className="px-5 py-3 bg-blue-50/60 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{language === 'ar' ? 'مسار التدقيق والنزاهة الأكاديمية:' : 'Academic Integrity Workflow:'}</span>{' '}
            {language === 'ar'
              ? 'يخضع كل ملف للفحص الأمني الفوري والتأكد من خلوه من أي محتوى ضار، ثم يُحال إلى طابور التدقيق الأكاديمي للتحقق من حقوق النشر قبل النشر العلني.'
              : 'Every file is screened for security in quarantine, and verified by academic editors for copyright compliance before public publishing.'}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. File Upload Dropzone */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'ar' ? '1. اختيار ملف الـ PDF (الحد الأقصى 25 ميجابايت) *' : '1. PDF File Selection (Max 25 MB) *'}
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-[#070e1c]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <FileText className="w-5 h-5" />
                  <span>{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-slate-700 dark:text-slate-300 font-medium">
                    {language === 'ar' ? 'انقر هنا لتحديد ملف الـ PDF' : 'Click to select your PDF file'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {language === 'ar' ? 'يقبل النظام ملفات PDF السليمة فقط مع فحص الترويسة الرقمية' : 'PDF files only with structural header validation'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? '2. عنوان الوثيقة أو المرجع *' : '2. Document Title *'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: ملخص مادة التشريح العام' : 'e.g. General Anatomy Study Summary'}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? '3. تصنيف المساهمة *' : '3. Contribution Category *'}
              </label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              >
                <option value="course_summary">{language === 'ar' ? 'ملخص مقرر دراسي' : 'Course Summary'}</option>
                <option value="lecture_notes">{language === 'ar' ? 'محاضرات وملاحظات شرح' : 'Lecture Notes'}</option>
                <option value="study_guide">{language === 'ar' ? 'ملزمة دراسية أو دليل عملي' : 'Study Guide / Handout'}</option>
                <option value="research_paper">{language === 'ar' ? 'ورقة علمية / مشروع تخرج' : 'Research Paper / Capstone'}</option>
                <option value="open_book">{language === 'ar' ? 'كتاب أكاديمي مفتوح' : 'Open Textbook'}</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'ar' ? '4. وصف محتويات الملف والمفردات المغطاة' : '4. Description & Covered Topics'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'ar' ? 'نبذة عن فصول الملف أو أهدافه التعليمية...' : 'Brief overview of chapters or concepts...'}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Academic Context Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? '5. الجامعة أو الكلية' : '5. Associated University'}
              </label>
              <select
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              >
                <option value="">{language === 'ar' ? 'عام / غير مقترن بجامعة محددة' : 'General / Not Institution Specific'}</option>
                {institutions.map((u) => (
                  <option key={u.id} value={u.id.toString()}>
                    {language === 'ar' ? u.nameAr : u.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? '6. رمز المقرر الدراسي (إن وجد)' : '6. Course Code'}
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. CS101, MED101"
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? '7. لغة المستند' : '7. Document Language'}
              </label>
              <select
                value={docLanguage}
                onChange={(e) => setDocLanguage(e.target.value as 'ar' | 'en')}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              >
                <option value="ar">{language === 'ar' ? 'العربية' : 'Arabic'}</option>
                <option value="en">{language === 'ar' ? 'الإنجليزية' : 'English'}</option>
              </select>
            </div>
          </div>

          {/* Attribution & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? '8. اسم المؤلف أو الأستاذ المحاضر' : '8. Author / Instructor Name'}
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: أ.د. محمد عبدالله' : 'e.g. Dr. Ahmed Al-Sabri'}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'ar' ? '9. نوع الترخيص الأكاديمي' : '9. Academic License'}
              </label>
              <select
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              >
                <option value="Creative Commons CC-BY 4.0">Creative Commons CC-BY 4.0 (نسب المصنف حراً)</option>
                <option value="Creative Commons CC-BY-NC 4.0">Creative Commons CC-BY-NC 4.0 (غير تجاري)</option>
                <option value="Open Educational Resource (OER)">Open Educational Resource (OER)</option>
                <option value="Public Domain">Public Domain (ملك عام أكاديمي)</option>
              </select>
            </div>
          </div>

          {/* Submitter Info (Visitors allowed) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-500" />
              <span>{language === 'ar' ? 'بيانات المساهم (متاح للزوار والمسجلين دون إجبار على إنشاء حساب)' : 'Contributor Details (Open to visitors and registered users)'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'ar' ? 'اسم المساهم *' : 'Your Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder={language === 'ar' ? 'الاسم الثلاثي أو المستعار' : 'Full Name or Contributor Handle'}
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'ar' ? 'البريد الإلكتروني للإشعار *' : 'Contact Email *'}
                </label>
                <input
                  type="email"
                  required
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Mandatory Legal Declaration */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={copyrightAccepted}
                onChange={(e) => setCopyrightAccepted(e.target.checked)}
                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="leading-relaxed">
                <span className="font-bold">{language === 'ar' ? 'إقرار حقوق الملكية الفكرية والنزاهة الأكاديمية (إلزامي):' : 'Copyright & Academic Integrity Declaration (Mandatory):'}</span>{' '}
                {language === 'ar'
                  ? 'أقر بأنني مؤلف هذا العمل أو أمتلك الصلاحية القانونية والترخيص الأكاديمي لمشاركته، وأن هذا الملف لا ينتهك أي حقوق نشر تجارية أو جدران دفع مغلقة.'
                  : 'I declare that I am the author of this material or hold legitimate authorization/open-access licensing to share it, and it does not violate commercial copyright.'}
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="px-6 py-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-semibold shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>{language === 'ar' ? 'جارٍ فحص ورفع الملف...' : 'Screening & Uploading...'}</span>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إرسال الملف للمراجعة الأكاديمية' : 'Submit for Academic Review'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
