import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { projects } from '../content/projects.mjs';
import { addSearchPages } from '../content/search-pages.mjs';
import { addDaxPages } from '../content/dax-challenge-page.mjs';

const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(await readFile(join(root, 'site.config.json'), 'utf8'));
const site = new URL(process.env.SITE_URL || config.url);
if (!['https:', 'http:'].includes(site.protocol)) throw new Error('SITE_URL must be an HTTP(S) URL');
site.pathname = site.pathname.replace(/\/+$/, '') + '/';
const base = site.href;
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const url = path => new URL(path, base).href;
const arrow = '<span aria-hidden="true">↗</span>';
const person = {
  '@type': 'Person', '@id': url('#person'), name: config.name, alternateName:'عمر مجدي',
  url: base, jobTitle: 'Freelance Power BI Developer & Data Analyst',
  image: url('assets/images/omar-magdy.webp'),
  email: `mailto:${config.email}`, telephone: config.phone,
  address: { '@type': 'PostalAddress', addressLocality: 'Cairo', addressCountry: 'EG' },
  sameAs: [config.github, config.linkedin], knowsAbout: ['Power BI', 'DAX', 'SQL', 'Power Query', 'Data Analysis', 'Reporting Automation']
};
const schema = (path, title, description, project) => ({
  '@context': 'https://schema.org', '@graph': [
    person,
    { '@type': 'WebSite', '@id': url('#website'), url: base, name: 'Omar Magdy — Data & Business Intelligence', inLanguage: 'en', publisher: { '@id': person['@id'] } },
    { '@type': 'WebPage', '@id': url(path + '#webpage'), url: url(path), name: title, description, inLanguage: 'en', isPartOf: { '@id': url('#website') }, about: { '@id': person['@id'] } },
    ...(project ? [
      { '@type': 'CreativeWork', '@id': url(path + '#project'), name: project.title, description: project.summary, creator: { '@id': person['@id'] }, url: url(path), image: url(`assets/images/${project.image}-1920.webp`), keywords: project.tags.join(', ') },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: base },
        { '@type': 'ListItem', position: 2, name: project.title, item: url(path) }
      ] }
    ] : [
      ...['Power BI Dashboard Development', 'SQL & Data Modeling', 'Reporting Automation'].map((name, i) => ({ '@type': 'Service', '@id': url(`#service-${i+1}`), name, provider: { '@id': person['@id'] }, url: url('#services'), areaServed: 'Worldwide', serviceType: name }))
    ])
  ]
});

function image(name, alt, dims, prefix, { eager = false, sizes = '100vw', className = '' } = {}) {
  const maxWidth = Math.min(dims[0], 1920);
  const srcset = [640,1280].filter(w => w < maxWidth).map(w => `${prefix}assets/images/${name}-${w}.webp ${w}w`);
  srcset.push(`${prefix}assets/images/${name}-1920.webp ${maxWidth}w`);
  return `<img src="${prefix}assets/images/${name}-1920.webp" srcset="${srcset.join(', ')}" sizes="${sizes}" width="${dims[0]}" height="${dims[1]}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${className ? ` class="${className}"` : ''}>`;
}

function header(prefix, home) {
  const anchor = home ? '' : `${prefix}index.html`;
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="container header-inner">
    <a class="brand" href="${prefix}index.html"><span class="monogram" aria-hidden="true">om.</span><span><span class="brand-name">Omar Magdy</span><span class="brand-role">Data &amp; Business Intelligence</span></span></a>
    <button class="menu-toggle" data-menu-toggle aria-controls="navigation" aria-expanded="true" hidden>Menu <span aria-hidden="true">☰</span></button>
    <nav class="navigation" id="navigation" aria-label="Main navigation">
      <a href="${anchor}#work">Selected work</a><a href="${anchor}#services">Services</a><a href="${anchor}#about">About</a><a href="${prefix}dax-challenge.html">DAX Challenge</a><a class="nav-contact" href="${anchor}#contact">Let’s talk <span class="arrow">${arrow}</span></a>
    </nav>
  </div></header>`;
}

function footer(prefix) {
  return `<footer class="site-footer"><div class="container footer-inner"><span>© ${new Date().getUTCFullYear()} Omar Magdy · Built with care, in Cairo.</span><div class="footer-links"><a href="${esc(config.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn ${arrow}</a><a href="${esc(config.github)}" target="_blank" rel="noopener noreferrer">GitHub ${arrow}</a><a href="mailto:${esc(config.email)}">Email ${arrow}</a><a href="${prefix}index.html#work">Selected work</a><a href="${prefix}dax-challenge.html">DAX Challenge</a></div></div></footer>`;
}

function contact({ form = false } = {}) {
  return `<section class="contact" id="contact" aria-labelledby="contact-title"><div class="container contact-grid">
    <div><div class="eyebrow">Have a project in mind?</div><h2 id="contact-title">Let’s put your<br>data to work.</h2>
      <p class="contact-intro">A new dashboard, a reporting bottleneck, or data that needs a clearer story. Tell me what you’re working on.</p>
      <a class="email-link" href="mailto:${esc(config.email)}">${esc(config.email)} ${arrow}</a>
      <div class="contact-tools"><button class="copy-button" data-copy-email="${esc(config.email)}">Copy email</button><a href="tel:${esc(config.phone)}">+20 112 014 3373</a></div>
      <p class="live-status" data-copy-status role="status" aria-live="polite"></p><p class="contact-location">Cairo, Egypt · Working remotely with clients worldwide</p>
    </div>
    ${form ? `<form class="contact-form" data-contact-form data-recipient="${esc(config.email)}" action="mailto:${esc(config.email)}" method="post" enctype="text/plain">
      <div class="form-row"><div class="field"><label for="contact-name">Your name</label><input id="contact-name" name="name" autocomplete="name" placeholder="Your name…" required maxlength="100"></div><div class="field"><label for="contact-email">Email address</label><input id="contact-email" name="email" type="email" autocomplete="email" placeholder="you@company.com…" spellcheck="false" required maxlength="254"></div></div>
      <div class="field"><label for="contact-service">What can I help with?</label><select id="contact-service" name="service"><option>Power BI dashboard</option><option>SQL &amp; data modeling</option><option>Reporting automation</option><option>Something else</option></select></div>
      <div class="field"><label for="contact-message">A little about your project</label><textarea id="contact-message" name="message" placeholder="Your goal, your data sources, and any deadline…" required minlength="10" maxlength="4000"></textarea></div>
      <button class="button" type="submit">Prepare an email draft ${arrow}</button><p class="form-note">This prepares a draft in your email app. Review it and press Send there. Your details aren’t stored on this website.</p>
      <p data-form-status role="status" aria-live="polite"></p><a class="draft-link" data-email-draft hidden>Open your email draft ${arrow}</a>
    </form>` : `<div class="contact-callout"><p class="contact-intro">Looking for something similar for your business?</p><a class="button" href="mailto:${esc(config.email)}?subject=Project%20enquiry">Discuss your project ${arrow}</a></div>`}
  </div></section>`;
}

function layout({ title, description, path = '', prefix = '', body, project, noindex = false, lang = 'en', alternate, service, head = '', singleLanguage = false }) {
  const data = schema(path, title, description, project);
  data['@graph'].forEach(n => { if(n.inLanguage) n.inLanguage = lang; });
  data['@graph'].find(n=>n['@type']==='WebSite').inLanguage=['en','ar'];
  if(lang === 'ar') data['@graph'].filter(n=>n['@type']==='Service').forEach((n,i)=>{n.name=['تصميم داشبورد وتقارير Power BI','تحليل البيانات وإعداد تقارير SQL','أتمتة التقارير للشركات'][i];n.serviceType=n.name;n.url=url('ar/index.html#services');});
  if(service) { data['@graph'] = data['@graph'].filter(n => n['@type'] !== 'Service'); data['@graph'].push({'@type':'Service', name:service, description, provider:{'@id':person['@id']}, url:url(path), areaServed:['Egypt','Worldwide']}, {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:lang==='ar'?'الرئيسية':'Home',item:url(lang==='ar'?'ar/index.html':'')},{'@type':'ListItem',position:2,name:service,item:url(path)}]}); }
  const graph = JSON.stringify(data).replace(/</g, '\\u003c');
  const counterpart = alternate ?? (lang === 'ar' ? path.replace(/^ar\//,'') : `ar/${path || 'index.html'}`);
  const english = lang === 'en' ? path : counterpart;
  const arabic = lang === 'ar' ? path : counterpart;
  const languageLinks = noindex || singleLanguage ? '' : `<link rel="alternate" hreflang="en" href="${url(english === 'index.html' ? '' : english)}"><link rel="alternate" hreflang="ar" href="${url(arabic)}"><link rel="alternate" hreflang="x-default" href="${url(english === 'index.html' ? '' : english)}">`;
  let navigation = header(prefix, path === '');
  if(lang === 'ar') navigation = `<a class="skip-link" href="#main">انتقل إلى المحتوى</a><header class="site-header"><div class="container header-inner"><a class="brand" href="/ar/index.html"><span class="monogram" aria-hidden="true">om.</span><span><span class="brand-name">عمر مجدي</span><span class="brand-role">تحليل البيانات وذكاء الأعمال</span></span></a><button class="menu-toggle" data-menu-toggle aria-controls="navigation" aria-expanded="true" hidden>القائمة ☰</button><nav class="navigation" id="navigation" aria-label="التنقل الرئيسي"><a href="/ar/index.html#work">أعمالي</a><a href="/ar/index.html#services">الخدمات</a><a href="/ar/index.html#about">عنّي</a><a href="/ar/index.html#contact">تواصل معي</a></nav></div></header>`;
  if(!noindex && !singleLanguage) navigation = navigation.replace('</nav>', `<a class="language-switch" href="${url(counterpart === 'index.html' ? '' : counterpart)}" lang="${lang === 'ar' ? 'en' : 'ar'}" hreflang="${lang === 'ar' ? 'en' : 'ar'}">${lang === 'ar' ? 'English' : 'العربية'}</a></nav>`);
  return `<!DOCTYPE html>
<html lang="${lang}"${lang === 'ar' ? ' dir="rtl"' : ''}><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${config.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(config.googleSiteVerification)}">` : ''}
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#f6f5f0"><meta name="color-scheme" content="light">
${noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<link rel="canonical" href="${esc(url(path))}">${languageLinks}<link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website"><meta property="og:site_name" content="Omar Magdy"><meta property="og:locale" content="${lang === 'ar' ? 'ar_EG' : 'en_US'}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url(path))}">
<meta property="og:image" content="${url('assets/images/social-card.jpg')}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Omar Magdy — Power BI Developer and Data Analyst. Better decisions, built on your data.">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${url('assets/images/social-card.jpg')}"><meta name="twitter:image:alt" content="Omar Magdy — Data and Business Intelligence">
<link rel="preload" href="${prefix}assets/fonts/manrope.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${prefix}assets/fonts/fraunces.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${prefix}assets/site.css"><script type="application/ld+json">${graph}</script><script src="${prefix}assets/site.js" defer></script>${head}
</head><body>${navigation}<main id="main">${singleLanguage ? '<!--single-language-->' : ''}${body}</main>${lang === 'ar' ? `<footer class="site-footer"><div class="container footer-inner"><span>© ${new Date().getUTCFullYear()} عمر مجدي · القاهرة، مصر</span><div class="footer-links"><a href="${config.linkedin}">LinkedIn</a><a href="${config.github}">GitHub</a><a href="mailto:${config.email}">البريد الإلكتروني</a></div></div></footer>` : footer(prefix)}</body></html>\n`;
}

function card(p, featured = false) {
  return `<a class="project-card ${featured ? 'featured-project' : ''}" href="projects/${p.slug}.html">
    <div class="project-image ${p.color}">${image(p.image, `${p.title} dashboard preview`, p.imageSize, '', { sizes: featured ? '(max-width: 760px) 90vw, 700px' : '(max-width: 480px) 90vw, (max-width: 760px) 45vw, 380px' })}</div>
    <div><div class="project-meta"><span>${esc(p.category)}</span><span class="project-number">${p.number} / Case study</span></div>
    <h3>${esc(p.title)} <span class="arrow" aria-hidden="true">↗</span></h3><p>${esc(p.summary)}</p><div class="tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>${featured ? '<span class="case-link">Explore the case study <span aria-hidden="true">↗</span></span>' : ''}</div>
  </a>`;
}

const home = `<section class="hero"><div class="container">
  <div class="hero-grid"><div class="intro-motion"><div class="eyebrow">Freelance Power BI Developer &amp; Data Analyst</div>
    <h1>Better decisions.<br><em>Built on your data.</em></h1>
    <p class="hero-intro">I’m Omar. I turn complex data into clear dashboards and reliable reporting—so you can spend less time assembling numbers, and more time acting on them.</p>
    <div class="hero-actions"><a class="button" href="#work">Explore my work ${arrow}</a><a class="text-link" href="#contact">Discuss a project ${arrow}</a></div>
    <p class="hero-location"><span class="status-dot" aria-hidden="true"></span> Based in Cairo · Available for freelance projects</p>
  </div><div class="hero-visual intro-motion"><div class="visual-caption"><span>A LOOK INSIDE MY WORK</span><span>01 / SALES &amp; RETAIL</span></div>
    <a class="project-card" href="projects/sales-retail.html"><div class="hero-board">${image(projects[0].image, 'Sales and Retail Power BI report showing sales, orders, return rate and regional trends', projects[0].imageSize, '', { eager:true, sizes:'(max-width: 760px) 90vw, 520px' })}<div class="board-tag"><strong>From the overview to the detail.</strong><span aria-hidden="true">↗</span></div></div></a>
    <div class="visual-note"><span class="note-mark" aria-hidden="true">↳</span><span>Explore the report, the model and the walkthrough.</span></div>
  </div></div>
  <div class="hero-foot"><p>The tools behind the work</p><div class="tool-list"><span>Power BI</span><span>SQL</span><span>DAX</span><span>Power Query</span><span>Python</span></div></div>
</div></section>
<section class="section work" id="work" aria-labelledby="work-title"><div class="container"><div class="section-heading"><div><div class="eyebrow">Selected work</div><h2 id="work-title">The data. The questions.<br>The work behind them.</h2></div><p>A selection of dashboards and analytical projects. Open a case study to see the thinking, the report and the detail.</p></div>${card(projects[0], true)}<div class="work-grid">${projects.slice(1).map(p=>card(p)).join('')}</div></div></section>
<section class="section services" id="services" aria-labelledby="services-title"><div class="container"><div class="section-heading"><div><div class="eyebrow">How I can help</div><h2 id="services-title">Useful reporting.<br>Built around your business.</h2></div><p>From the first business question to a report your team can actually use.</p></div><div class="services-grid">
<article class="service"><span class="service-num" aria-hidden="true">01</span><h3>Power BI dashboards</h3><p>Bring your key metrics into a clear, interactive view. Built for the decisions your team needs to make, with a visual hierarchy that makes sense.</p><ul><li>Executive &amp; operational dashboards</li><li>DAX measures &amp; interactive analysis</li><li>Report design &amp; documentation</li></ul></article>
<article class="service"><span class="service-num" aria-hidden="true">02</span><h3>SQL &amp; data modeling</h3><p>Give your reporting a dependable foundation. Connect the right tables, define consistent metrics and prepare data for useful analysis.</p><ul><li>SQL queries &amp; reporting datasets</li><li>Power Query data preparation</li><li>Semantic models &amp; relationships</li></ul></article>
<article class="service"><span class="service-num" aria-hidden="true">03</span><h3>Reporting automation</h3><p>Reduce repetitive work between your data and your reports. Build a workflow that is easier to maintain and less dependent on manual assembly.</p><ul><li>Python &amp; Google Apps Script</li><li>Excel reporting workflows</li><li>Process handover &amp; guidance</li></ul></article>
</div></div></section>
<section class="section" id="process" aria-labelledby="process-title"><div class="container"><div class="section-heading"><div><div class="eyebrow">The way I work</div><h2 id="process-title">Clear from the first conversation.</h2></div><p>A practical process, with room for questions and feedback along the way.</p></div><div class="process-grid">
<article class="process-step"><span class="step-number" aria-hidden="true">01</span><h3>Understand the goal</h3><p>We start with your business questions, data sources and the people who will use the report.</p></article>
<article class="process-step"><span class="step-number" aria-hidden="true">02</span><h3>Shape the foundation</h3><p>I review the data, clarify metric definitions and agree the scope and deliverables with you.</p></article>
<article class="process-step"><span class="step-number" aria-hidden="true">03</span><h3>Build &amp; refine</h3><p>We review a working version, check the numbers and refine the experience around your feedback.</p></article>
<article class="process-step"><span class="step-number" aria-hidden="true">04</span><h3>Hand over with care</h3><p>You receive the agreed files, documentation and guidance to keep using the solution confidently.</p></article>
</div></div></section>
<section class="section about" id="about" aria-labelledby="about-title"><div class="container about-grid"><div class="portrait-wrap"><img src="assets/images/omar-magdy.webp" alt="Omar Magdy, freelance data analyst based in Cairo" width="640" height="758" loading="lazy" decoding="async"><div class="portrait-caption"><span>Omar Magdy</span><span>Cairo, Egypt</span></div></div><div><div class="eyebrow">A little about me</div><h2 id="about-title">Technical detail.<br>Business perspective.</h2><p class="about-intro">I work where data, reporting and business needs meet. My focus is making complex information easier to understand—and easier to use.</p><p class="about-text">My experience spans contact-center reporting and technical consulting for property technology. I work with Power BI, SQL and automation tools to build dashboards, reporting interfaces and dependable workflows.</p><div class="experience"><div class="experience-item"><div><h3>Associate Technical Consultant</h3><p>Cloudy PropTech · Yardi implementation &amp; reporting</p></div><time datetime="2026-03">Mar 2026 — Present</time></div><div class="experience-item"><div><h3>Reporting Analyst</h3><p>Raya CX · Operational reporting &amp; analytics</p></div><time datetime="2023-10">Oct 2023 — Mar 2026</time></div></div><p class="credentials"><strong>A foundation in systems and analysis</strong>B.Sc. Management Information Systems, 2021.<br>Training and certifications in SQL (HackerRank), Power BI, DAX and Power Query (Udemy).</p></div></div></section>
<section class="faq" aria-labelledby="faq-title"><div class="container faq-layout"><div><div class="eyebrow">Before we start</div><h2 id="faq-title">A few useful answers.</h2></div><div class="faq-list">
<details><summary>What should I share for a project estimate?</summary><p>Your goal, the reports or metrics you need, your data sources and any deadline. An anonymized sample or a description of your data is enough to start the conversation.</p></details>
<details><summary>Can you improve an existing Power BI report?</summary><p>Yes. We can review the model, calculations and visual layout, then agree which changes will make the report more useful for your team.</p></details>
<details><summary>How are scope and pricing decided?</summary><p>We agree the requirements, deliverables, timeline and fee after reviewing the project. That keeps the work clear before development begins.</p></details>
<details><summary>Do you work with clients outside Egypt?</summary><p>Yes. I work remotely, with project discussions, reviews and handover arranged around an agreed schedule.</p></details>
</div></div></section>${contact({form:true})}`;

const generated = new Map();
generated.set('index.html', layout({ title: 'Omar Magdy | Freelance Power BI Developer & Data Analyst', description: 'Power BI dashboards, SQL data modeling and reporting automation by Omar Magdy. Explore real projects and discuss a tailored analytics solution for your business.', body: home }));

for (const [index, p] of projects.entries()) {
  const prefix = '../';
  const next = projects[(index+1)%projects.length];
  const body = `<div class="container"><a class="text-link back-link" href="../index.html#work"><span aria-hidden="true">←</span> Back to selected work</a><section class="case-hero"><div class="eyebrow">${esc(p.category)} / ${esc(p.type)}</div><h1>${esc(p.headline)}</h1><p class="case-lead">${esc(p.summary)}</p><div class="tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><dl class="case-detail-bar">${p.details.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section><div class="case-cover ${p.color}">${image(p.image, `${p.title} dashboard`, p.imageSize, prefix, { eager:true, sizes:'(max-width: 760px) 90vw, 1120px' })}</div>
<div class="case-body"><section class="case-copy"><h2>The question</h2><p>${esc(p.challenge)}</p></section><section class="case-copy"><h2>The approach</h2><p>${esc(p.approach)}</p></section><div class="capabilities">${p.capabilities.map(([title,text])=>`<article class="capability"><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div><section class="case-copy"><h2>What the report enables</h2><p>${esc(p.outcome)}</p></section><section class="gallery-heading" aria-labelledby="gallery-title"><div class="eyebrow">Inside the report</div><h2 id="gallery-title">A closer look.</h2><p>Open any screenshot to view it at full size.</p>${p.gallery.map(([name,title,caption,dims])=>`<figure class="report-figure"><a href="../assets/images/${name}-1920.webp" target="_blank" rel="noopener" aria-label="Open ${esc(title)} screenshot at full size">${image(name, `${title}: ${caption}`, dims, prefix, {sizes:'(max-width: 760px) 90vw, 1150px'})}</a><figcaption><strong>${esc(title)}</strong><span>${esc(caption)}</span></figcaption></figure>`).join('')}</section>
${p.pdf || p.video ? `<section class="project-resources" aria-labelledby="resources-title"><h2 id="resources-title">Go a little deeper.</h2>${p.pdf ? `<a class="button secondary" href="../assets/documents/${p.pdf[0]}" target="_blank" rel="noopener">${esc(p.pdf[1])} <span aria-hidden="true">↗</span><span class="sr-only"> (PDF, opens in a new tab)</span></a>` : ''}${p.video ? `<div class="video-shell" data-video><div><div class="video-icon" aria-hidden="true">▷</div><p>See the report in action. Loading the walkthrough connects to LinkedIn.</p><button class="button" data-video-button="${esc(p.video)}" data-video-title="${esc(p.title)} — LinkedIn walkthrough">Load video walkthrough <span aria-hidden="true">▷</span></button></div></div><a class="text-link" href="${esc(p.videoLink)}" target="_blank" rel="noopener noreferrer">Watch on LinkedIn ${arrow}</a>` : ''}</section>` : ''}
${p.sourceNote ? `<p class="source-note">${esc(p.sourceNote)}</p>` : ''}</div><div class="case-next"><p>UP NEXT / ${next.number}</p><a href="${next.slug}.html">${esc(next.title)} <span aria-hidden="true">↗</span></a></div></div>${contact()}`;
  generated.set(`projects/${p.slug}.html`, layout({ title:`${p.title} | Power BI Case Study — Omar Magdy`, description:p.description, path:`projects/${p.slug}.html`, prefix, project:p, body }));
}

generated.set('404.html', layout({title:'Page not found | Omar Magdy',description:'Return to Omar Magdy’s portfolio to explore Power BI and data analytics projects.',path:'404.html',prefix:site.pathname,noindex:true,body:'<section class="error-page container"><span class="error-code">404 / A SMALL DETOUR</span><h1>Nothing to report here.</h1><p>This page may have moved. Head back to the portfolio and pick up where you left off.</p><a class="button" href="/">Back to the portfolio <span aria-hidden="true">↗</span></a></section>'}));
generated.set('robots.txt', `User-agent: *\nAllow: /\nDisallow: /dax-admin\nDisallow: /api/\n\nSitemap: ${url('sitemap.xml')}\n`);
addSearchPages({generated, layout, projects, config, image, esc});
addDaxPages({generated, layout, esc});
const indexedPaths = [...generated.keys()].filter(p => p.endsWith('.html') && p !== '404.html').map(p => p === 'index.html' ? '' : p);
generated.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexedPaths.map(path=>`\n  <url><loc>${esc(url(path))}</loc></url>`).join('')}\n</urlset>\n`);
generated.set('.nojekyll', '');
generated.set('_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; frame-src https://www.linkedin.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action mailto:; frame-ancestors 'none'\n/assets/*\n  Cache-Control: public, max-age=3600, stale-while-revalidate=86400\n`);
generated.set('_redirects', `/ /index.html 200\n/index.html / 301\n/projects/sales-retail /projects/sales-retail.html 301\n/projects/adventureworks-sales /projects/adventureworks-sales.html 301\n/projects/call-center /projects/call-center.html 301\n/projects/hr-analytics /projects/hr-analytics.html 301\n/dax-challenge /dax-challenge.html 200\n`);

const dist = resolve(root,'dist');
if (relative(root, dist) !== 'dist') throw new Error('Unsafe output directory');
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
await cp(join(root,'assets'),join(dist,'assets'),{recursive:true,filter: path => !path.endsWith('.ttf')});
for (const [path, text] of generated) {
  for (const output of [root, dist]) {
    await mkdir(resolve(output,path,'..'),{recursive:true});
    await writeFile(join(output,path),text,'utf8');
  }
}
console.log(`Built ${indexedPaths.length + 1} HTML pages and SEO assets for ${base}`);
