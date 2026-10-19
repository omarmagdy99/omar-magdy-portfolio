# Omar Magdy — design notes

The portfolio uses an editorial direction: white space, navy ink and turquoise accents, restrained typography and actual dashboard imagery. Work takes precedence over decoration.

- Colors: white `#ffffff`, navy `#0b2d50`, turquoise `#087e83`, muted text `#536779`, borders `#dce7ec`, dark sections `#082b4c`. Original report screenshots keep their colors.
- Fonts: self-hosted Manrope for headings and body, with native Arabic font fallbacks.
- Layout: maximum content width 1200px; 96px total side margins on desktop, 40px on mobile. Use whitespace and section rules.
- Work: Sales & Retail is featured. Show original screenshots; describe capabilities without invented client results or impact numbers.
- Motion: a 600ms homepage entrance with a 120ms visual stagger, subtle hover transitions and once-only section reveals. Respect reduced motion. Content remains visible without JavaScript.
- Accessibility: skip link, semantic controls, labels, visible focus, image dimensions and native FAQ disclosures.
- Responsive: stack the hero and feature at 760px; one project column below 480px. Navigation stays available without JavaScript.
- Video: create LinkedIn embeds on request; a direct LinkedIn link is always available.
- Contact: prepare a mailto draft and explain that the visitor sends it from their email app. Never display a “message sent” state.

- Branding: original logo in the shared header and bilingual homepage hero, displayed in its original navy and turquoise colors; retain the source PNG. Hero pairs the business message with a real report preview, a small logo and a data-to-decision motif, inspired by the personal banner.

- Shared bilingual UI: `content/portfolio-ui.mjs` renders matching hero, process, FAQ and contact components, with Arabic case-study details. Edit generators and run `npm run build` rather than hand-editing generated HTML.
- Logo masters remain in the source tree. The public header uses a trimmed transparent 348×125 WebP (22 KB); source PNGs are excluded from dist.
- Social previews: localized 1200×630 PNGs. Optional `node scripts/gen-assets.mjs` regenerates them using Sharp when installed; ordinary builds use checked-in assets and need no image dependency.
- DAX figures scroll within focusable labeled regions at narrow widths, preserving readable SVG labels. No global overflow clipping.
- Preview: build first, then `npm run dev`; the local server mirrors exact `_redirects` rules and CSP. PORT can select another local port.
