# Verification — 11 October 2026

## Automated checks

- `npm run build`: passed; six static HTML pages plus sitemap, robots and hosting configuration.
- `npm run check`: passed; all internal links, anchor targets and local resources resolve; JSON-LD parses; images have dimensions and alternative text; each page has one h1, description, canonical and social metadata.
- `node --check assets/site.js` and `node --check scripts/build.mjs`: passed.
- `git diff --check`: passed.
- `npm install` audit: zero reported vulnerabilities for the 35 installed packages.
- Wrangler dry run and deployment: passed.

## Lighthouse mobile

Local production build tested with Lighthouse and headless Microsoft Edge, using Lighthouse’s default mobile simulation.

| Category | Score |
| --- | --- |
| Performance | 98 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |

Initial findings for process-number contrast and visible-label/accessibility-name mismatch were fixed, then the full audit was repeated. The final report has no failing binary audits. Full local reports are in `reports/lighthouse-mobile.report.html` and `.json` (ignored by Git).

These are lab results, not real-user Core Web Vitals and not a Google ranking guarantee.

## Browser checks

- Desktop home preview and deployed home: report image and self-hosted fonts render correctly.
- Mobile navigation: opens, links navigate and close the menu.
- Mobile layouts at 390px and 320px: no horizontal content overflow on the reviewed home and Sales & Retail pages.
- Contact form: valid sample values generate a correctly encoded mailto draft and focus the draft link. No message was sent during testing.
- Sales & Retail video: no iframe on initial load; the supplied LinkedIn embed loads on request and displays the correct report post and video player.
- The LinkedIn post confirms the public practice dataset, 4 fact tables, 4 dimensions and 66 DAX measures. The measure count was also checked in the local TMDL file.
- A desktop screenshot of the deployed build is saved as `reports/portfolio-desktop.jpg`.

## Hosting

- Worker: `omar-magdy-portfolio`.
- Primary domain: `https://omar.daaw.dev/`.
- Alternative host: `https://omar-magdy-portfolio.omarmagdy99860.workers.dev/`.
- Deployment version: `f95cc0d9-d76e-40ed-9d7b-43225cf92b09`.
- Primary-domain homepage, four project pages, sitemap, robots and CSS return HTTP 200 over verified TLS. `/index.html` redirects to `/`. An unknown nested URL returns the custom HTTP 404 page.
- Google and Cloudflare public DNS resolvers report the new domain. The development machine temporarily cached the pre-creation negative result; HTTP verification used a public-resolver address while preserving the domain hostname and TLS validation. The deployed page was also inspected in the browser on its alternative Cloudflare host.
- Other existing Workers/custom domains were not modified. No source PBIX, spreadsheets or local video files were deployed.

## Follow-up after release

Google Search Console URL-prefix ownership has now been verified using the public HTML verification tag. The repository changes are prepared locally on `feat/portfolio-redesign`; GitHub publishing commands are documented in README.

## Bilingual search content — 11 October 2026

- Added Arabic homepage and four project case studies, plus three distinct service pages in each language (16 indexable pages, 17 HTML pages including the 404).
- Every indexable page has its own canonical, reciprocal `en`/`ar` alternates and an English `x-default`. Arabic pages use RTL, translated navigation, metadata and visible text. Original report screenshots and PDF documents remain in their original English.
- All 16 sitemap URLs return HTTP 200 on the production domain. Sitemap and robots return 200 with the appropriate content types. Tests with a Googlebot user-agent also return 200; this is an HTTP check, not proof of Google's crawl.
- `npm run check` validates links, resources, anchors, JSON-LD, dimensions, sitemap coverage and reciprocal language links. `git diff --check` passes.
- Arabic homepage Lighthouse mobile lab scores: performance 98, accessibility 100, best practices 100, SEO 100. These are technical lab checks, not evidence of search rankings.
- Arabic homepage tested at 390px and Arabic service page at 320px with no horizontal overflow. The mobile menu expands correctly. Production Arabic metadata and content were inspected in the browser.
- Cloudflare deployment version: `7361ad95-7ef7-4466-9384-1fac517555d6`.
- Search Console: ownership verified; sitemap processed successfully with 16 discovered pages; English homepage indexing request accepted. At inspection, the homepage was discovered but not yet indexed.
- Arabic homepage indexing request was also accepted and added to the priority crawl queue. Both homepage inspections reported not yet indexed; request acceptance does not establish inclusion in Google Search.
- The sitemap list initially showed “Couldn't fetch”; the sitemap detail subsequently confirmed “Sitemap processed successfully”, last read 11 October 2026, 16 discovered pages. Screenshots are saved in the ignored `reports/` folder.
