import { checkLocalLinks } from './site-links.mjs';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname,'../dist');
const files = [];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await walk(p);else files.push(p);}}
await walk(root);
const pages = files.filter(p=>p.endsWith('.html'));
const errors=[];
for(const page of pages){
 const html=await readFile(page,'utf8');
 const name=page.slice(root.length+1);
 const check=(condition,message)=>{if(!condition)errors.push(`${name}: ${message}`);};
 check((html.match(/<h1[\s>]/g)||[]).length===1,'must contain exactly one h1');
 check(/<meta name="description" content="[^"]+"/.test(html),'missing description');
 check(/<link rel="canonical" href="https:\/\//.test(html),'missing absolute canonical');
 check(/property="og:image" content="https:\/\//.test(html),'missing share image');
 check(/<main id="main">/.test(html),'missing main landmark');
 check(!/forkan|bpwebs|onclick=/i.test(html),'legacy project or inline handler remains');
 try {const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(graph['@context'],'https://schema.org');assert(graph['@graph'].some(n=>n['@type']==='Person'));}catch{errors.push(`${name}: invalid structured data`);}
 for(const img of html.matchAll(/<img\b[^>]*>/g))check(/\balt="/.test(img[0])&&/\bwidth="\d+"/.test(img[0])&&/\bheight="\d+"/.test(img[0]),'image lacks accessible text or dimensions');
 errors.push(...await checkLocalLinks(root,page,html));
}
const sitemap=await readFile(join(root,'sitemap.xml'),'utf8');
assert.equal((sitemap.match(/<loc>/g)||[]).length,pages.length-1,'sitemap must include every indexable page');
for(const page of pages.filter(p=>!p.endsWith('404.html'))){
 const html=await readFile(page,'utf8');
 const canonical=html.match(/rel="canonical" href="([^"]+)"/)[1];
 assert(sitemap.includes(`<loc>${canonical}</loc>`),'canonical must be in sitemap');
 const alternates=[...html.matchAll(/rel="alternate" hreflang="(en|ar)" href="([^"]+)"/g)];
 if(html.includes('<!--single-language-->')){assert.equal(alternates.length,0,'single-language pages must not declare alternates');continue;}
 assert.equal(alternates.length,2,'each page needs both language alternates');
 for(const [,language,href] of alternates){
  const pathname=new URL(href).pathname;
  const counterpart=await readFile(join(root,pathname==='/'?'index.html':pathname.slice(1)),'utf8');
  assert(counterpart.includes(`href="${canonical}"`),'language alternates must be reciprocal');
  assert(counterpart.includes(`<html lang="${language}"`),'language alternate must point to the right language');
 }
 if(html.includes('<html lang="ar"'))assert(html.includes('dir="rtl"'),'Arabic needs right-to-left layout');
}
assert((await readFile(join(root,'robots.txt'),'utf8')).includes('Sitemap: https://'));
// Grading internals must never be published: the repository is public, so only the secret seeds keep the hidden data hidden.
for(const file of files){
 const name=file.slice(root.length+1);
 if(/datagen|expected\.json/.test(name))errors.push(`${name}: grading data or generator must not be published`);
 if(/\.(js|mjs|json)$/.test(name)&&/HIDDEN_SEED|hiddenSeeds/.test(await readFile(file,'utf8')))errors.push(`${name}: mentions hidden grading seeds`);
}
const size=(await Promise.all(files.map(async p=>(await stat(p)).size))).reduce((a,b)=>a+b,0);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`PASS: ${pages.length} pages, all local links/anchors/assets, structured data, image dimensions and SEO metadata. ${files.length} published files, ${(size/1024/1024).toFixed(2)} MB total.`);
