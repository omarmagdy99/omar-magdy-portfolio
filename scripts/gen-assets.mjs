import sharp from 'sharp';

async function run() {
  const logo = sharp('assets/images/omar-magdy-logo-transparent.png').trim();
  // Generate header logo: 348x125 (exact 2x for 174x62.5 display)
  await logo.clone().resize({ width: 348 }).webp({ quality: 92, effort: 6 }).toFile('assets/images/omar-magdy-logo-header.webp');
  // Generate hero/general logo: 870x312 (crisp high-res WebP)
  await logo.clone().resize({ width: 870 }).webp({ quality: 92, effort: 6 }).toFile('assets/images/omar-magdy-logo.webp');
  
  // Base64 logo for embedding in SVG (high quality PNG with alpha)
  const logoBuf = await logo.clone().resize({ width: 320 }).png().toBuffer();
  const logoB64 = 'data:image/png;base64,' + logoBuf.toString('base64');
  
  // English card SVG
  const enSvg = Buffer.from(`<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgEn" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#061a2f"/>
        <stop offset="50%" stop-color="#082b4c"/>
        <stop offset="100%" stop-color="#0b3761"/>
      </linearGradient>
      <linearGradient id="tealGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#41d3c1"/>
        <stop offset="100%" stop-color="#087e83"/>
      </linearGradient>
    </defs>
    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bgEn)"/>
    
    <!-- Subtle technical grid & accent lines -->
    <g stroke="#153f68" stroke-width="1" opacity="0.45">
      <line x1="80" y1="0" x2="80" y2="630"/>
      <line x1="1120" y1="0" x2="1120" y2="630"/>
      <line x1="0" y1="135" x2="1200" y2="135"/>
      <line x1="0" y1="515" x2="1200" y2="515"/>
    </g>
    
    <!-- Decorative circle motif -->
    <circle cx="1060" cy="190" r="260" fill="none" stroke="#184b7a" stroke-width="2" opacity="0.35"/>
    <circle cx="1060" cy="190" r="180" fill="none" stroke="#41d3c1" stroke-width="1.5" opacity="0.3"/>
    
    <!-- Header: Logo in deliberate white panel for high contrast & real colors -->
    <rect x="80" y="44" width="250" height="82" rx="8" fill="#ffffff" stroke="#c2dbe8" stroke-width="1.5"/>
    <image href="${logoB64}" x="95" y="51" width="220" height="68"/>
    
    <text x="1120" y="92" fill="#7ea5c2" font-family="'Segoe UI', -apple-system, sans-serif" font-size="20" font-weight="600" text-anchor="end" letter-spacing="1">omar.daaw.dev</text>
    <circle cx="965" cy="85" r="5" fill="#41d3c1"/>
    
    <!-- Content Area -->
    <rect x="80" y="176" width="38" height="4" fill="url(#tealGrad)" rx="2"/>
    <text x="130" y="182" fill="#41d3c1" font-family="'Segoe UI', -apple-system, sans-serif" font-size="16" font-weight="700" letter-spacing="2">FREELANCE POWER BI DEVELOPER &amp; DATA ANALYST</text>
    
    <text x="80" y="255" fill="#ffffff" font-family="'Segoe UI', -apple-system, sans-serif" font-size="52" font-weight="800" letter-spacing="-1">Turning data into</text>
    <text x="80" y="322" fill="#ffffff" font-family="'Segoe UI', -apple-system, sans-serif" font-size="52" font-weight="800" letter-spacing="-1">clear business decisions.</text>
    
    <text x="80" y="380" fill="#a2c4dc" font-family="'Segoe UI', -apple-system, sans-serif" font-size="22" font-weight="400">Interactive dashboards, dependable SQL modeling, and reporting automation.</text>
    
    <!-- Feature tags -->
    <g transform="translate(80, 438)">
      <rect x="0" y="0" width="145" height="42" rx="6" fill="#123659" stroke="#245582" stroke-width="1"/>
      <text x="72" y="26" fill="#e3edf4" font-family="'Segoe UI', -apple-system, sans-serif" font-size="15" font-weight="600" text-anchor="middle">Power BI</text>
      
      <rect x="160" y="0" width="155" height="42" rx="6" fill="#123659" stroke="#245582" stroke-width="1"/>
      <text x="237" y="26" fill="#e3edf4" font-family="'Segoe UI', -apple-system, sans-serif" font-size="15" font-weight="600" text-anchor="middle">DAX Measures</text>
      
      <rect x="330" y="0" width="165" height="42" rx="6" fill="#123659" stroke="#245582" stroke-width="1"/>
      <text x="412" y="26" fill="#e3edf4" font-family="'Segoe UI', -apple-system, sans-serif" font-size="15" font-weight="600" text-anchor="middle">SQL Data Modeling</text>
      
      <rect x="510" y="0" width="195" height="42" rx="6" fill="#123659" stroke="#245582" stroke-width="1"/>
      <text x="607" y="26" fill="#e3edf4" font-family="'Segoe UI', -apple-system, sans-serif" font-size="15" font-weight="600" text-anchor="middle">Reporting Automation</text>
    </g>
    
    <!-- Footer -->
    <text x="80" y="565" fill="#6f93b0" font-family="'Segoe UI', -apple-system, sans-serif" font-size="16" font-weight="500">Cairo, Egypt · Working remotely with clients worldwide</text>
    <text x="1120" y="565" fill="#41d3c1" font-family="'Segoe UI', -apple-system, sans-serif" font-size="16" font-weight="700" text-anchor="start" direction="rtl">Explore portfolio ↗</text>
  </svg>`);
  
  await sharp(enSvg).png({ quality: 95 }).toFile('assets/images/social-card-en.png');
  
  // Arabic card SVG - Standard LTR SVG coordinates (0..1200) without root direction="rtl"
  const arSvg = Buffer.from(`<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgAr" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#061a2f"/>
        <stop offset="50%" stop-color="#082b4c"/>
        <stop offset="100%" stop-color="#0b3761"/>
      </linearGradient>
      <linearGradient id="tealGradAr" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0%" stop-color="#41d3c1"/>
        <stop offset="100%" stop-color="#087e83"/>
      </linearGradient>
    </defs>
    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bgAr)"/>
    
    <!-- Subtle technical grid & accent lines -->
    <g stroke="#153f68" stroke-width="1" opacity="0.45">
      <line x1="80" y1="0" x2="80" y2="630"/>
      <line x1="1120" y1="0" x2="1120" y2="630"/>
      <line x1="0" y1="135" x2="1200" y2="135"/>
      <line x1="0" y1="515" x2="1200" y2="515"/>
    </g>
    
    <!-- Decorative circle motif -->
    <circle cx="140" cy="190" r="260" fill="none" stroke="#184b7a" stroke-width="2" opacity="0.35"/>
    <circle cx="140" cy="190" r="180" fill="none" stroke="#41d3c1" stroke-width="1.5" opacity="0.3"/>
    
    <!-- Header: Domain on left -->
    <circle cx="230" cy="85" r="5" fill="#41d3c1"/>
    <text x="80" y="92" fill="#7ea5c2" font-family="'Segoe UI', Tahoma, sans-serif" font-size="20" font-weight="600" text-anchor="start" letter-spacing="1">omar.daaw.dev</text>
    
    <!-- Header: Logo in deliberate white panel on right (x=870..1120) -->
    <rect x="870" y="44" width="250" height="82" rx="8" fill="#ffffff" stroke="#c2dbe8" stroke-width="1.5"/>
    <image href="${logoB64}" x="885" y="51" width="220" height="68"/>
    
    <!-- Eyebrow: text right-aligned at x=1120, small accent bar at right -->
    <rect x="1082" y="176" width="38" height="4" fill="url(#tealGradAr)" rx="2"/>
    <text x="1066" y="182" fill="#41d3c1" font-family="'Segoe UI', Tahoma, sans-serif" font-size="16" font-weight="700" text-anchor="start" direction="rtl">عمر مجدي · مطور POWER BI ومحلل بيانات مستقل</text>
    
    <!-- Main Headline right-aligned at x=1120 -->
    <text x="1120" y="255" fill="#ffffff" font-family="'Segoe UI', Tahoma, sans-serif" font-size="50" font-weight="800" text-anchor="start" direction="rtl">نحوّل البيانات إلى</text>
    <text x="1120" y="325" fill="#ffffff" font-family="'Segoe UI', Tahoma, sans-serif" font-size="50" font-weight="800" text-anchor="start" direction="rtl">قرارات أعمال أوضح.</text>
    
    <!-- Description right-aligned at x=1120 -->
    <text x="1120" y="380" fill="#a2c4dc" font-family="'Segoe UI', Tahoma, sans-serif" font-size="22" font-weight="400" text-anchor="start" direction="rtl">لوحات تحكم تفاعلية، نمذجة بيانات SQL موثوقة، وأتمتة التقارير للشركات.</text>
    
    <!-- Feature tags placed from right edge (1120) inward -->
    <g transform="translate(1120, 438)">
      <rect x="-165" y="0" width="165" height="42" rx="6" fill="#123659" stroke="#245582" stroke-width="1"/>
      <text x="-82" y="26" fill="#e3edf4" font-family="'Segoe UI', Tahoma, sans-serif" font-size="15" font-weight="600" text-anchor="middle">داشبورد Power BI</text>
      
      <rect x="-335" y="0" width="155" height="42" rx="6" fill="#123659" stroke="#245582" stroke-width="1"/>
      <text x="-257" y="26" fill="#e3edf4" font-family="'Segoe UI', Tahoma, sans-serif" font-size="15" font-weight="600" text-anchor="middle">مقاييس DAX</text>
      
      <rect x="-525" y="0" width="175" height="42" rx="6" fill="#123659" stroke="#245582" stroke-width="1"/>
      <text x="-437" y="26" fill="#e3edf4" font-family="'Segoe UI', Tahoma, sans-serif" font-size="15" font-weight="600" text-anchor="middle">نمذجة بيانات SQL</text>
      
      <rect x="-695" y="0" width="155" height="42" rx="6" fill="#123659" stroke="#245582" stroke-width="1"/>
      <text x="-617" y="26" fill="#e3edf4" font-family="'Segoe UI', Tahoma, sans-serif" font-size="15" font-weight="600" text-anchor="middle">أتمتة التقارير</text>
    </g>
    
    <!-- Footer -->
    <text x="1120" y="565" fill="#6f93b0" font-family="'Segoe UI', Tahoma, sans-serif" font-size="16" font-weight="500" text-anchor="start" direction="rtl">القاهرة، مصر · أعمل عن بُعد مع عملاء داخل مصر وخارجها</text>
    <text x="80" y="565" fill="#41d3c1" font-family="'Segoe UI', Tahoma, sans-serif" font-size="16" font-weight="700" text-anchor="start">استعرض الأعمال ↖</text>
  </svg>`);
  
  await sharp(arSvg).png({ quality: 95 }).toFile('assets/images/social-card-ar.png');
  console.log('Regenerated social-card-en.png and social-card-ar.png with white logo panels and verified text anchoring');
}
run();
