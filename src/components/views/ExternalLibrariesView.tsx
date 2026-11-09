/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * External Yemeni academic library directory.
 * Links open the institutions' own pages; no remote scraping or bulk downloading
 * is performed by this client-side directory.
 */
import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { BookOpen, ExternalLink, Search, Library, FileText } from 'lucide-react';

type LibrarySource = {
  id: string;
  nameAr: string;
  nameEn: string;
  url: string;
  category: 'catalog' | 'university' | 'repository' | 'institute';
  noteAr: string;
  noteEn: string;
  status: 'directory' | 'repository' | 'source';
};

const SOURCES: LibrarySource[] = [
  { id:'oliye', nameAr:'الفهرس اليمني الموحد OLIYE', nameEn:'OLIYE Union Catalogue', url:'https://oliye.net/opac/', category:'catalog', noteAr:'فهرس موحد؛ سجل الكتاب لا يعني توفر ملف إلكتروني.', noteEn:'Union catalogue; a bibliographic record does not imply an online file.', status:'directory' },
  { id:'oliye-libraries', nameAr:'دليل المكتبات المشاركة في OLIYE', nameEn:'OLIYE Participating Libraries', url:'https://oliye.net/libraries/', category:'catalog', noteAr:'دليل المكتبات المشاركة.', noteEn:'Directory of participating libraries.', status:'directory' },
  { id:'oliye-search', nameAr:'البحث في مكتبات OLIYE', nameEn:'OLIYE Library Search', url:'https://oliye.net/opac/libraries', category:'catalog', noteAr:'اختيار المكتبة والبحث في فهارسها.', noteEn:'Select a library and search its catalogue.', status:'directory' },
  { id:'sanaa-oliye', nameAr:'فهرس كتب جامعة صنعاء', nameEn:'Sana’a University Book Catalogue', url:'https://oliye.net/opac/?formaction=index&inxlibid=12&mttyp=bk&qt=tp', category:'catalog', noteAr:'سجلات كتب مفهرسة وليست ملفات تنزيل بالضرورة.', noteEn:'Bibliographic book records, not necessarily downloadable files.', status:'directory' },
  { id:'qau-oliye', nameAr:'فهرس جامعة الملكة أروى في OLIYE', nameEn:'Queen Arwa University Catalogue', url:'https://oliye.net/opac/?inxlibid=50', category:'catalog', noteAr:'فهرس المكتبة.', noteEn:'Library catalogue.', status:'directory' },
  { id:'ums-oliye', nameAr:'فهرس جامعة العلوم الحديثة في OLIYE', nameEn:'Modern Science University Catalogue', url:'https://oliye.net/opac/?inxlibid=36', category:'catalog', noteAr:'فهرس المكتبة.', noteEn:'Library catalogue.', status:'directory' },
  { id:'ust-admin-oliye', nameAr:'فهرس العلوم الإدارية – جامعة العلوم والتكنولوجيا', nameEn:'UST Administrative Sciences Catalogue', url:'https://oliye.net/opac/?inxlibid=25', category:'catalog', noteAr:'فهرس المكتبة.', noteEn:'Library catalogue.', status:'directory' },
  { id:'ust-open-oliye', nameAr:'فهرس التعليم المفتوح – جامعة العلوم والتكنولوجيا', nameEn:'UST Open Education Catalogue', url:'https://oliye.net/opac/?formaction=index&inxlibid=24&qt=a', category:'catalog', noteAr:'فهرس مكتبة التعليم المفتوح.', noteEn:'Open education library catalogue.', status:'directory' },
  { id:'ust', nameAr:'جامعة العلوم والتكنولوجيا – المكتبة', nameEn:'University of Science and Technology Library', url:'https://ust.edu.ye/lib/', category:'university', noteAr:'صفحة المكتبة الجامعية.', noteEn:'University library page.', status:'source' },
  { id:'qau', nameAr:'جامعة الملكة أروى – المكتبة الإلكترونية', nameEn:'Queen Arwa University E-Library', url:'https://qau.edu.ye/en/elibrary', category:'university', noteAr:'تتضمن مواد وصفحات كتب؛ تحقق من الترخيص لكل ملف.', noteEn:'Book pages and materials; verify each file licence.', status:'source' },
  { id:'ust-repository', nameAr:'مستودع جامعة العلوم والتكنولوجيا', nameEn:'UST Digital Repository', url:'https://repository.ust.edu.ye/home', category:'repository', noteAr:'مستودع أبحاث ومواد أكاديمية؛ الترخيص يختلف حسب السجل.', noteEn:'Research repository; licence varies by item.', status:'repository' },
  { id:'amu', nameAr:'جامعة الأوائل الحديثة – المكتبة', nameEn:'Al-Awael Modern University Library', url:'https://up.amu-ye.com/library', category:'university', noteAr:'قد تحيل بعض المواد إلى خدمات خارجية أو تتطلب حساباً.', noteEn:'Some materials may link to external services or require an account.', status:'source' },
  { id:'nu', nameAr:'جامعة الناصر – المكتبة الإلكترونية', nameEn:'Al-Nasser University E-Library', url:'https://www.nu.edu.ye/en/ebook/', category:'university', noteAr:'صفحة مكتبة إلكترونية؛ تحقق من عمل روابط المواد.', noteEn:'E-library page; check individual resource links.', status:'source' },
  { id:'hikma', nameAr:'جامعة الحكمة – المكتبة', nameEn:'Al-Hikma University Library', url:'https://hikma.edu.ye/en/library', category:'university', noteAr:'توجد مواد أكاديمية وروابط تنزيل لبعض الأبحاث.', noteEn:'Academic materials and download links for some papers.', status:'source' },
  { id:'alsaeed', nameAr:'جامعة السعيد – مكتبة الأبحاث', nameEn:'Al-Saeed University Research Library', url:'https://alsaeeduni.edu.ye/en/research/library', category:'university', noteAr:'صفحة خدمات ومصادر بحثية.', noteEn:'Research library services and resources.', status:'source' },
  { id:'sanaa', nameAr:'جامعة صنعاء – المكتبة الرقمية', nameEn:'Sana’a University Digital Library', url:'https://su.edu.ye/clib/ar/المكتبة-الرقمية/كتب-2/', category:'university', noteAr:'صفحة المكتبة الرقمية؛ تحقق من حالة الوصول.', noteEn:'Digital library page; access may vary.', status:'source' },
  { id:'teci', nameAr:'المعهد التكنولوجي الدولي TECI', nameEn:'TECI International Technological Institute', url:'https://teci.edu.ye/pages/library.php', category:'institute', noteAr:'كتب ومشاريع وحقائب تدريبية؛ بعض روابط التنزيل تحتاج تحققاً.', noteEn:'Books, projects and training materials; verify download links.', status:'source' },
  { id:'rayan', nameAr:'جامعة الريان – المكتبة الإلكترونية', nameEn:'Al-Rayan University E-Library', url:'https://alrayan-university.edu.ye/electronic-library/', category:'university', noteAr:'تضم كتباً ورسائل أكاديمية.', noteEn:'Includes books and academic theses.', status:'source' },
  { id:'saba', nameAr:'جامعة سبأ – المكتبة', nameEn:'Saba University Library', url:'https://www.saba.edu.ye/Liberaries/Home', category:'university', noteAr:'صفحة تعريف وخدمات المكتبة.', noteEn:'Library information and services page.', status:'source' },
  { id:'ums', nameAr:'جامعة العلوم الحديثة – المكتبة الإلكترونية', nameEn:'Modern Science University E-Library', url:'https://ums.edu.ye/ebook/', category:'university', noteAr:'أقسام أكاديمية متعددة؛ توافر الملفات يحتاج فحصاً.', noteEn:'Multiple academic categories; file availability requires checking.', status:'source' },
  { id:'yemen', nameAr:'جامعة اليمن – مكتبة الطلاب', nameEn:'Yemen University Student Library', url:'https://www.yemenuniversity.com/ar/students-aff/library', category:'university', noteAr:'صفحة مكتبة الجامعة.', noteEn:'University library page.', status:'source' },
  { id:'21sep', nameAr:'جامعة 21 سبتمبر – مستودع الأبحاث', nameEn:'21 September University Research Portal', url:'https://www.ojs.21umas.edu.ye/irss/ar/index', category:'repository', noteAr:'بوابة دورية وأبحاث علمية.', noteEn:'Journal and research portal.', status:'repository' },
  { id:'ibb', nameAr:'جامعة إب – بوابة المواد التعليمية', nameEn:'Ibb University Learning Materials', url:'https://ibbunivlms.tech/mod/page/view.php?id=70', category:'university', noteAr:'قد تتطلب بعض المواد تسجيل الدخول.', noteEn:'Some materials may require sign-in.', status:'source' },
  { id:'ust-ddqa', nameAr:'جامعة العلوم والتكنولوجيا – مكتبة عمادة الجودة', nameEn:'UST Quality Assurance Deanship Library', url:'https://ust.edu.ye/ddqa/library/', category:'university', noteAr:'صفحة مكتبة العمادة.', noteEn:'Deanship library page.', status:'source' },
  { id:'aden', nameAr:'جامعة عدن – المكتبة والإصدارات', nameEn:'University of Aden Library and Publications', url:'https://www.aden-univ.net/pag/71', category:'university', noteAr:'صفحة المكتبة والإصدارات؛ قد تتوفر قوائم فهرسية.', noteEn:'Library and publications page; catalogues may be available.', status:'source' },
  { id:'razi', nameAr:'جامعة الرازي – المكتبة الإلكترونية', nameEn:'Al-Razi University E-Library', url:'https://alraziuni.edu.ye/المكتبات/librariebook', category:'university', noteAr:'صفحة المكتبة الإلكترونية.', noteEn:'E-library page.', status:'source' },
  { id:'future', nameAr:'جامعة المستقبل – كتب الجامعة', nameEn:'Future University Books', url:'https://futureuniversity.edu.ye/university_book/', category:'university', noteAr:'صفحة الكتب الجامعية.', noteEn:'University books page.', status:'source' },
  { id:'sfi', nameAr:'مكتبة SFI', nameEn:'SFI Library', url:'https://library.sfic-yemen.org/', category:'university', noteAr:'بوابة مكتبة مستقلة.', noteEn:'Independent library portal.', status:'source' },
  { id:'azal', nameAr:'جامعة آزال – المكتبة الإلكترونية', nameEn:'Azal University E-Library', url:'https://www.auhd.edu.ye/elibrary', category:'university', noteAr:'صفحة المكتبة الإلكترونية.', noteEn:'E-library page.', status:'source' },
  { id:'mscollege', nameAr:'الكلية التخصصية الحديثة – المكتبة الإلكترونية', nameEn:'Modern Specialized College E-Library', url:'https://mscollege.edu.ye/المكتبة-الإلكترونية/', category:'university', noteAr:'صفحة المكتبة الإلكترونية.', noteEn:'E-library page.', status:'source' },
  { id:'msu', nameAr:'جامعة العلوم الحديثة – المكتبة الرقمية', nameEn:'Modern Science University Digital Library', url:'https://msu.edu.ye/المكتبة-الرقمية/', category:'university', noteAr:'رابط إضافي وارد ضمن قائمة المصادر؛ يحتاج إعادة تحقق.', noteEn:'Additional discovered source; re-verification required.', status:'source' },
];

const VERIFIED_FILES = [
  { id:'rayan-pdf', titleAr:'المحاسبة في شركات التأمين', titleEn:'Accounting in Insurance Companies', institutionAr:'جامعة الريان', institutionEn:'Al-Rayan University', url:'https://alrayan-university.edu.ye/wp-content/uploads/2022/05/المحاسبة-في-شركات-التأمين-1.pdf', verified:true, noteAr:'PDF فُتح وقُرئ محتواه في الفحص السابق. تحقق من حقوق إعادة التوزيع قبل النسخ.', noteEn:'PDF opened and read in the previous check. Confirm redistribution rights before copying.' },
  { id:'hikma-pdf', titleAr:'Proposed assessment model to determine the best association mining technique related to business processes re-engineering', titleEn:'Proposed assessment model to determine the best association mining technique related to business processes re-engineering', institutionAr:'جامعة الحكمة', institutionEn:'Al-Hikma University', url:'https://hikma.edu.ye/en/download.php?id=159', verified:true, noteAr:'بحث PDF فُتح وقُرئ محتواه؛ لا يعني ذلك أن إعادة نشره مسموحة.', noteEn:'Research PDF opened and read; this does not itself grant redistribution rights.' },
];

const UNCERTAIN_FILES = [
  { id:'teci4', titleAr:'مادة TECI رقم 4', titleEn:'TECI resource #4', url:'https://teci.edu.ye/pages/download.php?id=4' },
  { id:'teci5', titleAr:'مادة TECI رقم 5', titleEn:'TECI resource #5', url:'https://teci.edu.ye/pages/download.php?id=5' },
  { id:'qau-epi', titleAr:'علم الأوبئة', titleEn:'Epidemiology', url:'https://qau.edu.ye/storage/media/qau-2024-02-23-48343-697048ed22a65.pdf' },
];

export const ExternalLibrariesView: React.FC = () => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const labels = {
    title: ar ? 'دليل المكتبات والمستودعات اليمنية' : 'Yemeni Libraries & Repositories',
    intro: ar ? 'بوابة للوصول إلى فهارس المكتبات الجامعية والمستودعات الأكاديمية. الروابط تفتح المواقع الأصلية ولا تنفذ تنزيلات جماعية.' : 'A directory of university catalogues and academic repositories. Links open original sites; no bulk downloads are performed.',
    search: ar ? 'ابحث عن جامعة أو مكتبة...' : 'Search universities or libraries...',
    all: ar ? 'جميع المصادر' : 'All sources',
    catalog: ar ? 'فهارس موحدة' : 'Union catalogues',
    university: ar ? 'مكتبات جامعية' : 'University libraries',
    repository: ar ? 'مستودعات وأبحاث' : 'Repositories & research',
    institute: ar ? 'معاهد وكليات' : 'Institutes & colleges',
    open: ar ? 'فتح المصدر' : 'Open source',
    files: ar ? 'ملفات أكاديمية مكتشفة' : 'Discovered academic files',
    confirmed: ar ? 'تم التحقق من PDF' : 'PDF verified',
    pending: ar ? 'يحتاج تحققاً' : 'Needs verification',
    rights: ar ? 'الحقوق والترخيص' : 'Copyright & licensing',
    rightsText: ar ? 'التحقق من إمكانية فتح الملف لا يمنح حق إعادة نشره. لا تُضاف الملفات إلى مستودع التنزيل إلا بعد توثيق الترخيص أو الإذن، مع إبقاء مصدرها الأصلي وبياناتها.' : 'Being able to open a file does not grant redistribution rights. Add files to a download repository only after documenting the licence or permission, preserving the original source and metadata.',
    note: ar ? 'حالة الرابط قد تتغير؛ بعض المواقع قد تتطلب حساباً أو قد تكون غير متاحة مؤقتاً.' : 'Link status can change; some sites may require an account or be temporarily unavailable.',
  };
  const filtered = useMemo(() => SOURCES.filter(s => {
    const haystack = `${s.nameAr} ${s.nameEn} ${s.noteAr} ${s.noteEn}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (category === 'all' || s.category === category);
  }), [query, category]);

  return (
    <div className="min-h-[70vh] bg-slate-50 dark:bg-[#070e1c] py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold mb-2"><Library className="w-4 h-4"/>{ar ? 'مصادر أكاديمية خارجية' : 'External academic sources'}</div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white">{labels.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">{labels.intro}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] p-4 mb-6 grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={labels.search} className="w-full ps-10 pe-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:border-blue-500"/>
          </div>
          <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-3 text-sm">
            <option value="all">{labels.all}</option>
            <option value="catalog">{labels.catalog}</option>
            <option value="university">{labels.university}</option>
            <option value="repository">{labels.repository}</option>
            <option value="institute">{labels.institute}</option>
          </select>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900 dark:text-white">{ar ? 'المصادر' : 'Sources'}</h2>
          <span className="text-xs text-slate-500">{filtered.length} {ar ? 'مصدر' : 'sources'}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(source => (
            <article key={source.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white leading-6">{ar ? source.nameAr : source.nameEn}</h3>
                <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] text-slate-600 dark:text-slate-300">{source.category === 'catalog' ? labels.catalog : source.category === 'repository' ? labels.repository : source.category === 'institute' ? labels.institute : labels.university}</span>
              </div>
              <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">{ar ? source.noteAr : source.noteEn}</p>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                {labels.open}<ExternalLink className="w-4 h-4"/>
              </a>
            </article>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-center py-12 text-sm text-slate-500">{ar ? 'لا توجد نتائج مطابقة.' : 'No matching sources.'}</p>}

        <section className="mt-12">
          <div className="flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-blue-600"/><h2 className="text-xl font-bold text-slate-900 dark:text-white">{labels.files}</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VERIFIED_FILES.map(file => (
              <article key={file.id} className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-[#0c1830] p-5">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{labels.confirmed}</span>
                <h3 className="mt-2 font-bold text-slate-900 dark:text-white">{ar ? file.titleAr : file.titleEn}</h3>
                <p className="text-xs text-slate-500 mt-1">{ar ? file.institutionAr : file.institutionEn}</p>
                <p className="text-xs leading-6 text-slate-500 mt-2">{ar ? file.noteAr : file.noteEn}</p>
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex mt-3 items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">{labels.open}<ExternalLink className="w-4 h-4"/></a>
              </article>
            ))}
            {UNCERTAIN_FILES.map(file => (
              <article key={file.id} className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-white dark:bg-[#0c1830] p-5">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{labels.pending}</span>
                <h3 className="mt-2 font-bold text-slate-900 dark:text-white">{ar ? file.titleAr : file.titleEn}</h3>
                <p className="text-xs text-slate-500 mt-2">{labels.note}</p>
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex mt-3 items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">{labels.open}<ExternalLink className="w-4 h-4"/></a>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-4">
          <h3 className="font-bold text-amber-900 dark:text-amber-300">{labels.rights}</h3>
          <p className="text-xs leading-7 text-amber-900/80 dark:text-amber-200/80 mt-1">{labels.rightsText}</p>
        </div>
      </div>
    </div>
  );
};
