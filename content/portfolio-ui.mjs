// Shared bilingual UI. Rendered to static HTML; no client framework or remote dependencies.
const arrow = '<span aria-hidden="true">↗</span>';

export function heroSection({ projects, image, esc, lang = 'en', prefix = '' }) {
  const ar = lang === 'ar';
  const p = projects[0];
  const title = ar ? 'داشبورد المبيعات والتجزئة' : p.title;
  const href = 'projects/' + p.slug + '.html';
  return '<section class="hero"><div class="container"><div class="hero-grid">' +
    '<div class="intro-motion"><div class="eyebrow">' + (ar ? 'عمر مجدي · مطور Power BI ومحلل بيانات' : 'Freelance Power BI Developer &amp; Data Analyst') + '</div>' +
    '<h1>' + (ar ? 'بيانات معقدة.<br><em>قرارات أوضح.</em>' : 'Complex data.<br><em>Clear decisions.</em>') + '</h1>' +
    '<p class="hero-intro">' + (ar ? 'أنا عمر. أحوّل البيانات المتفرقة إلى داشبورد واضح وتقارير موثوقة، عشان تقضي وقت أقل في تجميع الأرقام، ووقت أكثر في اتخاذ القرار.' : 'I’m Omar. I turn scattered data into clear dashboards and reliable reporting—so you spend less time assembling numbers, and more time acting on them.') + '</p>' +
    '<div class="hero-method" aria-label="' + (ar ? 'من مصادر البيانات إلى نموذج واضح ثم قرار مدروس' : 'From data sources, through a clear model, to an informed decision') + '">' +
    '<span><b>01</b> ' + (ar ? 'البيانات' : 'Data') + '</span><i aria-hidden="true">' + (ar ? '←' : '→') + '</i><span><b>02</b> ' + (ar ? 'النموذج' : 'Model') + '</span><i aria-hidden="true">' + (ar ? '←' : '→') + '</i><span><b>03</b> ' + (ar ? 'القرار' : 'Decision') + '</span></div>' +
    '<div class="hero-actions"><a class="button" href="#work">' + (ar ? 'استعرض أعمالي' : 'Explore my work') + ' ' + arrow + '</a><a class="text-link" href="#contact">' + (ar ? 'ناقش مشروعك' : 'Discuss a project') + ' ' + arrow + '</a></div>' +
    '<p class="hero-location"><span class="status-dot" aria-hidden="true"></span>' + (ar ? 'القاهرة، مصر · متاح للعمل المستقل عن بُعد' : 'Based in Cairo · Available for freelance projects') + '</p></div>' +
    '<div class="hero-visual intro-motion"><div class="hero-card"><div class="hero-card__header"><span class="hero-card__logo"><img src="' + prefix + 'assets/images/omar-magdy-logo-header.webp" width="348" height="125" alt="Omar Magdy — Data Analysis &amp; Power BI" decoding="async"></span><span class="hero-card__badge"><span class="badge-dot" aria-hidden="true"></span>' + (ar ? 'من أعمالي' : 'Inside my work') + '</span></div>' +
    '<a class="hero-card__preview" href="' + href + '">' + image(p.image, ar ? 'تقرير Power BI لتحليل المبيعات والطلبات والمرتجعات' : 'Sales and Retail Power BI report: sales, orders, returns and regional performance', p.imageSize, prefix, { eager: true, sizes: '(max-width:760px) 90vw, 520px' }) + '</a>' +
    '<div class="hero-card__footer"><div class="hero-card__title"><strong>' + esc(title) + '</strong><span>' + (ar ? 'من الصورة العامة إلى تفاصيل المنتج.' : 'From the big picture to the product detail.') + '</span></div><a class="hero-card__link" href="' + href + '">' + (ar ? 'المشروع' : 'Case study') + ' ' + arrow + '</a></div></div>' +
    '<p class="hero-caption"><span aria-hidden="true">↳</span> ' + (ar ? 'تقرير حقيقي. نموذج بيانات. وطريقة تنفيذ واضحة.' : 'The real report. The model. The thinking behind it.') + '</p></div></div>' +
    '<div class="hero-foot"><p>' + (ar ? 'الأدوات وراء كل تقرير' : 'The tools behind the work') + '</p><div class="tool-list" dir="ltr"><span>Power BI</span><span>SQL</span><span>DAX</span><span>Power Query</span><span>Python</span></div></div></div></section>';
}

export function processSection(lang = 'en') {
  const ar = lang === 'ar';
  const steps = ar ? [
    ['نفهم الهدف', 'نبدأ بأسئلة العمل، ومصادر البيانات، والأشخاص الذين سيستخدمون التقرير.'],
    ['نبني الأساس', 'أراجع البيانات والعلاقات وتعريف المؤشرات، ونتفق على النطاق والمخرجات.'],
    ['ننفّذ ونحسّن', 'نراجع نسخة عملية، ونتحقق من الأرقام، ونحسّن التجربة بناءً على ملاحظاتك.'],
    ['نسلّم بوضوح', 'تستلم الملفات والتوثيق والإرشادات المتفق عليها، عشان تقدر تكمل استخدام الحل بثقة.']
  ] : [
    ['Understand the goal', 'We start with your business questions, data sources and the people who will use the report.'],
    ['Shape the foundation', 'I review the data, clarify metric definitions and agree the scope and deliverables with you.'],
    ['Build &amp; refine', 'We review a working version, check the numbers and refine the experience around your feedback.'],
    ['Hand over with care', 'You receive the agreed files, documentation and guidance to keep using the solution confidently.']
  ];
  return '<section class="section reveal-on-scroll" id="process" aria-labelledby="process-title"><div class="container"><div class="section-heading"><div><div class="eyebrow">' +
    (ar ? 'طريقة العمل' : 'The way I work') + '</div><h2 id="process-title">' + (ar ? 'خطوات واضحة.<br>من أول نقاش إلى التسليم.' : 'Clear from the first conversation.') +
    '</h2></div><p>' + (ar ? 'طريقة عملية، مع مساحة للأسئلة والمراجعة في كل خطوة.' : 'A practical process, with room for questions and feedback along the way.') +
    '</p></div><div class="process-grid">' + steps.map((s, i) => '<article class="process-step"><span class="step-number" aria-hidden="true">0' + (i + 1) +
      '</span><h3>' + s[0] + '</h3><p>' + s[1] + '</p></article>').join('') + '</div></div></section>';
}

export function faqSection(lang = 'en') {
  const ar = lang === 'ar';
  const questions = ar ? [
    ['ما المطلوب لطلب عرض سعر؟', 'الهدف من التقرير، المؤشرات المطلوبة، مصادر البيانات والموعد المستهدف. يمكن البدء بوصف البيانات أو عينة مجهولة الهوية.'],
    ['هل يمكن تحسين تقرير Power BI موجود؟', 'نعم. نراجع نموذج البيانات والحسابات والتصميم، ثم نتفق على التغييرات التي تجعل التقرير أكثر فائدة لفريقك.'],
    ['كيف نحدد النطاق والتكلفة؟', 'نتفق على المتطلبات والمخرجات والمدة والتكلفة بعد مراجعة المشروع، لتكون خطوات العمل واضحة قبل التنفيذ.'],
    ['هل تعمل مع عملاء خارج مصر؟', 'نعم. أعمل عن بُعد، ونتفق على مواعيد النقاش والمراجعات والتسليم بما يناسب المشروع.']
  ] : [
    ['What should I share for a project estimate?', 'Your goal, the reports or metrics you need, your data sources and any deadline. An anonymized sample or a description of your data is enough to start the conversation.'],
    ['Can you improve an existing Power BI report?', 'Yes. We can review the model, calculations and visual layout, then agree which changes will make the report more useful for your team.'],
    ['How are scope and pricing decided?', 'We agree the requirements, deliverables, timeline and fee after reviewing the project. That keeps the work clear before development begins.'],
    ['Do you work with clients outside Egypt?', 'Yes. I work remotely, with project discussions, reviews and handover arranged around an agreed schedule.']
  ];
  return '<section class="faq reveal-on-scroll" aria-labelledby="faq-title"><div class="container faq-layout"><div><div class="eyebrow">' + (ar ? 'قبل أن نبدأ' : 'Before we start') +
    '</div><h2 id="faq-title">' + (ar ? 'إجابات تساعدك تبدأ.' : 'A few useful answers.') + '</h2></div><div class="faq-list">' +
    questions.map(q => '<details><summary>' + q[0] + '</summary><p>' + q[1] + '</p></details>').join('') + '</div></div></section>';
}

export function contactSection({ config, esc, lang = 'en', form = false }) {
  const ar = lang === 'ar';
  const email = esc(config.email);
  const services = ar ? ['داشبورد Power BI', 'SQL ونمذجة البيانات', 'أتمتة التقارير', 'خدمة أخرى'] : ['Power BI dashboard', 'SQL & data modeling', 'Reporting automation', 'Something else'];
  const field = (id, label, input) => '<div class="field"><label for="' + id + '">' + label + '</label>' + input + '</div>';
  const input = (id, name, extra) => '<input id="' + id + '" name="' + name + '" ' + extra + '>';
  return '<section class="contact" id="contact" aria-labelledby="contact-title"><div class="container contact-grid"><div><div class="eyebrow">' +
    (ar ? 'لديك مشروع؟' : 'Have a project in mind?') + '</div><h2 id="contact-title">' + (ar ? 'خلّي بياناتك<br>تشتغل لصالحك.' : 'Let’s put your<br>data to work.') +
    '</h2><p class="contact-intro">' + (ar ? 'داشبورد جديد، تقرير متكرر بياخد وقت، أو بيانات محتاجة صورة أوضح. احكي لي عن هدفك ومصادر بياناتك.' : 'A new dashboard, a reporting bottleneck, or data that needs a clearer story. Tell me what you’re working on.') +
    '</p><a class="email-link" dir="ltr" href="mailto:' + email + '">' + email + ' ' + arrow + '</a><div class="contact-tools"><button type="button" class="copy-button" data-copy-email="' + email + '">' +
    (ar ? 'انسخ البريد' : 'Copy email') + '</button><a dir="ltr" href="tel:' + esc(config.phone) + '">+20 112 014 3373</a></div><p class="live-status" data-copy-status role="status" aria-live="polite"></p><p class="contact-location">' +
    (ar ? 'القاهرة، مصر · أعمل عن بُعد مع عملاء داخل مصر وخارجها' : 'Cairo, Egypt · Working remotely with clients worldwide') + '</p></div>' +
    (form ? '<form class="contact-form" data-contact-form data-recipient="' + email + '" action="mailto:' + email + '" method="post" enctype="text/plain"><div class="form-row">' +
      field('contact-name', ar ? 'اسمك' : 'Your name', input('contact-name', 'name', 'autocomplete="name" placeholder="' + (ar ? 'اسمك…' : 'Your name…') + '" required maxlength="100"')) +
      field('contact-email', ar ? 'البريد الإلكتروني' : 'Email address', input('contact-email', 'email', 'type="email" dir="ltr" autocomplete="email" placeholder="you@company.com…" spellcheck="false" required maxlength="254"')) + '</div>' +
      field('contact-service', ar ? 'كيف أقدر أساعدك؟' : 'What can I help with?', '<select id="contact-service" name="service">' + services.map(s => '<option>' + esc(s) + '</option>').join('') + '</select>') +
      field('contact-message', ar ? 'نبذة عن مشروعك' : 'A little about your project', '<textarea id="contact-message" name="message" placeholder="' + (ar ? 'هدفك، مصادر البيانات، والموعد المطلوب…' : 'Your goal, your data sources, and any deadline…') + '" required minlength="10" maxlength="4000"></textarea>') +
      '<button class="button" type="submit">' + (ar ? 'جهّز مسودة بريد' : 'Prepare an email draft') + ' ' + arrow + '</button><p class="form-note">' +
      (ar ? 'الخطوة دي تجهّز مسودة في تطبيق البريد. راجعها واضغط إرسال هناك. بيانات النموذج لا تُخزَّن على الموقع.' : 'This prepares a draft in your email app. Review it and press Send there. Your details aren’t stored on this website.') +
      '</p><p data-form-status role="status" aria-live="polite"></p><a class="draft-link" data-email-draft hidden>' + (ar ? 'افتح مسودة البريد' : 'Open your email draft') + ' ' + arrow + '</a></form>' :
      '<div class="contact-callout"><p class="contact-intro">' + (ar ? 'محتاج حل مشابه لشغلك؟' : 'Looking for something similar for your business?') + '</p><a class="button" href="mailto:' + email + '">' + (ar ? 'ناقش مشروعك' : 'Discuss your project') + ' ' + arrow + '</a></div>') + '</div></section>';
}

const detailCopy = {
  'sales-retail': {
    details: [['صفحات التقرير', 'نظرة عامة + استكشاف المنتجات'], ['النموذج', '4 جداول حقائق + 4 أبعاد'], ['الدور', 'نموذج البيانات ومقاييس DAX وتصميم التقرير']],
    capabilities: [
      ['ابدأ بالصورة العامة', 'المبيعات والطلبات ومتوسط الطلب والخصومات والمرتجعات في نظرة واحدة، مع مقارنة الاتجاه الشهري بالعام السابق.'],
      ['استكشف تفاصيل المنتجات', 'فلاتر الفئات وترتيب المبيعات ربع السنوي، ومقارنة المبيعات بالمرتجعات ومصفوفة المنتج والمنطقة.'],
      ['مقارنات لها معنى', 'مقاييس العام السابق تتطلب اختيار سنة واحدة، إلى جانب مقاييس YTD والتغير الشهري وحصص المبيعات.']
    ]
  },
  'adventureworks-sales': {
    details: [['واجهات التقرير', 'تنفيذية، مناطق، منتجات وعملاء'], ['التركيز', 'الإيرادات وأداء المبيعات'], ['الدور', 'التحليل وتطوير الداشبورد']],
    capabilities: [
      ['نظرة تنفيذية', 'نقطة بداية لمراجعة الإيرادات ومؤشرات المبيعات قبل الانتقال إلى التفاصيل.'],
      ['تحليل المناطق والمنتجات', 'واجهات مخصصة لاستكشاف الفروق الجغرافية وأداء الطلبات على مستوى المنتج.'],
      ['فهم العملاء', 'ربط صورة المبيعات بالعملاء والشرائح التي تسهم فيها.']
    ]
  },
  'call-center': {
    details: [['مجال العمل', 'عمليات مراكز الاتصال'], ['التركيز', 'AHT، SLA وCSAT'], ['الدور', 'إعداد التقارير وتطوير الداشبورد']],
    capabilities: [
      ['مؤشرات التشغيل في سياق واحد', 'متوسط زمن معالجة المكالمة ومستوى الخدمة ورضا العملاء في نفس الصورة التحليلية.'],
      ['مراجعة قابلة للتكرار', 'داشبورد موحّد يوفّر للفريق مكانًا مشتركًا لمراجعة الأداء التشغيلي.'],
      ['شرح أثناء الاستخدام', 'عرض الفيديو على LinkedIn يضيف سياقًا عمليًا إلى صور التقرير.']
    ]
  },
  'hr-analytics': {
    details: [['مجال العمل', 'الموارد البشرية'], ['التركيز', 'عدد الموظفين والتعويضات'], ['الدور', 'تجهيز البيانات وDAX والتصورات']],
    capabilities: [
      ['نظرة للقوى العاملة', 'مؤشرات عدد الموظفين وإنهاء الخدمة لفهم تركيب القوى العاملة.'],
      ['سياق التعويضات', 'استكشاف متوسط الرواتب ومقارنات الأجور والاختلافات بين الأقسام.'],
      ['توثيق بجانب التقرير', 'ملف PDF وشرح فيديو لتسهيل مراجعة طريقة العمل وفهمها.']
    ]
  }
};

export function arabicCase({ p, c, next, nextTitle, image, esc, config, related }) {
  const prefix = '../../';
  const detail = detailCopy[p.slug];
  const section = (title, text) => '<section class="case-copy"><h2>' + title + '</h2><p>' + esc(text) + '</p></section>';
  const resources = (!p.pdf && !p.video) ? '' : '<section class="project-resources" aria-labelledby="resources-title"><h2 id="resources-title">تعمّق في تفاصيل المشروع.</h2>' +
    (p.pdf ? '<a class="button secondary" href="/assets/documents/' + esc(p.pdf[0]) + '" target="_blank" rel="noopener">اقرأ التوثيق (PDF باللغة الإنجليزية) ' + arrow + '</a>' : '') +
    (p.video ? '<div class="video-shell" data-video><div><div class="video-icon" aria-hidden="true">▷</div><p>شاهد التقرير أثناء الاستخدام. تحميل الفيديو يتصل بموقع LinkedIn.</p><button class="button" data-video-button="' + esc(p.video) + '" data-video-title="' + esc(c.title) + '">تحميل شرح الفيديو <span aria-hidden="true">▷</span></button></div></div><a class="text-link" href="' + esc(p.videoLink) + '" target="_blank" rel="noopener noreferrer">شاهد على LinkedIn ' + arrow + '</a>' : '') + '</section>';
  return '<div class="container"><a class="text-link back-link" href="/ar/index.html#work"><span aria-hidden="true">→</span> العودة إلى الأعمال</a><section class="case-hero"><div class="eyebrow">مشروع من معرض الأعمال</div><h1>' + esc(c.title) + '</h1><p class="case-lead">' + esc(c.summary) + '</p><div class="tags">' +
    p.tags.map(t => '<span dir="ltr" translate="no">' + esc(t) + '</span>').join('') + '</div><dl class="case-detail-bar">' +
    detail.details.map(d => '<div><dt>' + d[0] + '</dt><dd>' + d[1] + '</dd></div>').join('') + '</dl></section><div class="case-cover ' + p.color + '">' +
    image(p.image, c.title, p.imageSize, prefix, { eager: true, sizes: '(max-width:760px) 90vw, 1120px' }) + '</div><div class="case-body">' + section('السؤال', c.challenge) + section('طريقة التنفيذ', c.approach) +
    '<div class="capabilities">' + detail.capabilities.map(d => '<article class="capability"><h3>' + d[0] + '</h3><p>' + d[1] + '</p></article>').join('') + '</div>' +
    section('ما الذي يتيحه التقرير؟', c.outcome) + '<section class="gallery-heading" aria-labelledby="gallery-title"><div class="eyebrow">من داخل التقرير</div><h2 id="gallery-title">نظرة أقرب.</h2><p>اضغط على الصورة لعرضها بالحجم الكامل. واجهة التقرير الأصلية باللغة الإنجليزية.</p>' +
    p.gallery.map(([name, title, caption, dims], i) => '<figure class="report-figure"><a href="/assets/images/' + name + '-1920.webp" target="_blank" rel="noopener" aria-label="افتح صورة الواجهة ' + (i + 1) + ' بالحجم الكامل">' +
      image(name, c.title + ' — واجهة ' + (i + 1), dims, prefix, { sizes: '(max-width:760px) 90vw, 1120px' }) + '</a><figcaption><strong>واجهة ' + (i + 1) + '</strong><span lang="en" dir="ltr">' + esc(title) + '</span></figcaption></figure>').join('') +
    '</section>' + resources + (c.note ? '<p class="source-note">' + esc(c.note) + '</p>' : p.sourceNote || p.pdf ? '<p class="source-note">مشروع معرض أعمال؛ الأرقام توضح إمكانات التقرير ولا تُعرض باعتبارها نتائج محسّنة لأعمال عميل.</p>' : '') +
    '</div><div class="case-next"><p>المشروع التالي / ' + next.number + '</p><a href="' + next.slug + '.html">' + esc(nextTitle) + ' ' + arrow + '</a></div><div class="services-grid related-services">' + related + '</div></div>' +
    contactSection({ config, esc, lang: 'ar' });
}
