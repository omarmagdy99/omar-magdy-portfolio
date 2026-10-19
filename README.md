# Omar Magdy — Portfolio

معرض أعمال ثابت وخفيف لمطور Power BI ومحلل البيانات عمر مجدي، مع أربع دراسات حالة: Sales & Retail، AdventureWorks، Call Center، HR Analytics.

الدومين المستهدف: **https://omar.daaw.dev**. مشروع Cloudflare مستقل اسمه `omar-magdy-portfolio`.

## التشغيل المحلي

يتطلب Node.js 22 أو أحدث.

```powershell
npm ci
npm run build
npm run check
npm run dev
```

افتح http://127.0.0.1:4173. أعد البناء ثم أعد تحميل المتصفح بعد التعديل؛ المعاينة لا تستخدم hot reload.

## أماكن التعديل

| الملف | المحتوى |
| --- | --- |
| `content/projects.mjs` | نصوص المشاريع وصورها وفيديوهاتها وتوثيقها |
| `scripts/build.mjs` | قوالب الصفحة الرئيسية ودراسات الحالة وSEO |
| `assets/site.css` | التصميم والتجاوب |
| `assets/site.js` | قائمة الهاتف وتجهيز مسودة البريد ونسخ البريد وتحميل الفيديو |
| `site.config.json` | الدومين ووسائل التواصل |
| `assets/images/` | صور WebP بمقاسات متعددة وصورة المشاركة |
| `assets/documents/` | توثيق Sales وHR بصيغة PDF |
| `wrangler.jsonc` | إعدادات نشر Cloudflare |

`npm run build` يولد HTML وملفات SEO في جذر المستودع ونسخة للنشر داخل `dist/`. عدّل المصدر ثم أعد البناء؛ لا تعدّل HTML المولد مباشرة. لا تُنشر ملفات PBIX أو البيانات الخام أو الفيديوهات المحلية أو مجلد `SRC` القديم.

## التواصل والفيديو

النموذج **يجهز مسودة بريد** ولا يرسل رسالة من الخادم. يراجع الزائر المسودة ويرسلها في تطبيق البريد. البريد المباشر والرقم متاحان أيضًا. لا تُخزن بيانات الزائر على الموقع.

فيديو Sales & Retail يستخدم منشور LinkedIn الذي أرسله عمر (`7512802432620617729`). الفيديوهات تُحمّل عند الطلب مع روابط بديلة على LinkedIn.

## النشر على Cloudflare

```powershell
npx wrangler whoami
npm run build
npm run check
npx wrangler deploy --dry-run
npm run deploy
```

يتطلب تسجيل الدخول للحساب الذي يملك `daaw.dev`. الإعداد يستخدم Workers Static Assets ويربط **فقط** `omar.daaw.dev` بالمشروع الجديد. إذا وُجد سجل أو مشروع سابق على الاسم راجعه قبل استبداله. لا توجد أسرار أو tokens في المستودع.

استخدم `dist/` للنشر على استضافة ثابتة. `_headers` و`_redirects` يتطلبان دعم الاستضافة؛ Cloudflare يدعمهما.

## تحديث GitHub

التعديلات على الفرع `feat/portfolio-redesign`. بعد المراجعة:

```powershell
git status
git add .
git commit -m "Redesign portfolio with case studies and SEO"
git push -u origin feat/portfolio-redesign
```

ثم افتح Pull Request إلى `main`. إذا كانت GitHub Pages تخدم جذر `main`، الملفات المولدة جاهزة بروابط نسبية. يبقى canonical موجهًا إلى دومين Cloudflare الأساسي. لا يوجد نشر آلي يعتمد على أسرار؛ يمكن ربط Workers Builds أو GitHub Actions لاحقًا.

## SEO بعد النشر

- لكل صفحة عنوان ووصف وCanonical وOG وTwitter Cards وJSON-LD.
- البيانات المنظمة: Person وWebSite وWebPage وService، مع CreativeWork وBreadcrumbList للمشاريع.
- Sitemap يسرد 16 صفحة: الرئيسية وأربع دراسات مشاريع وثلاث خدمات، بكل من العربية والإنجليزية؛ صفحة 404 تستخدم noindex.
- ملف robots في جذر الدومين الفرعي، وصورة المشاركة 1200×630.
- تمت إضافة URL-prefix property لـ `https://omar.daaw.dev/` في Google Search Console والتحقق منها بعلامة HTML. احتفظ بقيمة `googleSiteVerification` في الإعدادات حتى لا تفقد إثبات الملكية.
- عالج جوجل خريطة الموقع بنجاح واكتشف 16 صفحة. تم قبول طلب فهرسة الرئيسية العربية والإنجليزية؛ هذا لا يعني أن الصفحات ظهرت بالفعل في نتائج البحث.
- تابع استعلامات البحث والزيارات والاستفسارات، وأضف نتائج مشاريع موثقة وروابط شهادات قابلة للتحقق.
- عند تغيير الدومين عدّل `site.config.json` ثم أعد البناء. يمكن تجاوز الدومين مؤقتًا عبر متغير `SITE_URL`.

التجهيز التقني لا يضمن ترتيبًا محددًا أو ظهورًا فوريًا في Google. نتائج الأداء المختبرية ليست قياسات Core Web Vitals للمستخدمين الحقيقيين.

## المحتوى العربي واستهداف البحث

- عدّل المحتوى العربي وصفحات الخدمات باللغتين في `content/search-pages.mjs`، ثم شغّل `npm run build` و`npm run check` قبل النشر.
- العربية في `/ar/index.html`، مع دراسات المشاريع في `/ar/projects/` والخدمات في `/ar/services/`. المحتوى HTML ثابت يعمل دون JavaScript.
- لكل صفحة canonical خاص بها وhreflang متبادل للعربية والإنجليزية وx-default للإنجليزية. لا يوجد تحويل تلقائي للغة بحسب المتصفح.
- صفحات الخدمات: تطوير داشبورد Power BI، تحليل البيانات وتقارير SQL، وأتمتة التقارير. تجمع كل صفحة نطاق العمل والمخرجات والأسئلة الشائعة ومشروعًا مرتبطًا بها.
- تركز الكلمات الإنجليزية على Freelance Power BI Developer وPower BI Developer Egypt وPower BI Dashboard Development وSQL Reporting وReporting Automation Services. تركز العربية على مطور Power BI في مصر وتصميم داشبورد وتقارير Power BI ومحلل بيانات مستقل وأتمتة التقارير للشركات.
- روابط الصفحات الجديدة تبدأ من جذر الموقع؛ عند النشر على GitHub Pages استخدم دومينًا مستقلًا أو غيّر الروابط إذا كنت ستستخدم مسار repository فرعيًا.

## DAX challenge (`/dax-challenge`)

An interactive DAX challenge with a Power BI-style editor, instant grading, a leaderboard and analytics.

- `assets/dax/` — DAX engine (`engine.js`), editor (`editor.js`, `intellisense.js`), page controller (`challenge.js`), styles, sample data.
- `worker/worker.js` — Cloudflare Worker API (`/api/dax/*`, `/dax-admin`) backed by D1; `migrations/` holds the schema and reporting views.
- `content/dax-challenge-page.mjs` — the page copy; `npm run build` generates `dax-challenge.html`.
- `npm test` runs the engine and editor tests; `npm run gen:dax` regenerates the sample data and expected answers.
- Local: copy `.dev.vars` (ADMIN_TOKEN, HASH_SALT), `npx wrangler d1 migrations apply DB --local`, then `npm run dev:api`.
- Deploy (one-time): `npx wrangler d1 create omar-portfolio` → put the id in `wrangler.jsonc` → `npx wrangler d1 migrations apply DB --remote` → `npx wrangler secret put ADMIN_TOKEN` and `HASH_SALT` → `npm run deploy`. Stats live at `/dax-admin`.
- Three levels unlock in order (average order value, month-over-month growth, retention). The server enforces the lock; `scripts/load-test.mjs` simulates many visitors against a local `wrangler dev`.
