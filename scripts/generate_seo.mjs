import fs from 'node:fs';
import path from 'node:path';

function exists(p){ try { fs.accessSync(p); return true; } catch { return false; } }
const full = JSON.parse(fs.readFileSync('dist/full/site.json','utf8'));
const overrides = exists('content/seo_overrides.json') ? JSON.parse(fs.readFileSync('content/seo_overrides.json','utf8')) : {};
const outPath = path.join('dist','seo.json');

function routeFor(ci, li){ return `#ch${ci+1}-lo${li+1}`; }
function assessRoute(ci){ return `#ch${ci+1}-assessment`; }
function strip(s=''){ return String(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }

const seo = {};

(full.chapters||[]).forEach((ch,ci)=>{
  (ch.los||[]).forEach((lo,li)=>{
    const url = routeFor(ci,li);
    const name = lo.title || `Learning Objective ${ci+1}.${li+1}`;
    const desc = strip(lo.preview || lo.snippets?.[0]?.body || '');
    const h3s = (lo.snippets||[]).map(s=>s?.title).filter(Boolean);
    const base = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": name,
      "description": desc,
      "keywords": h3s.slice(0,8).join(', '),
      "mainEntityOfPage": { "@type": "WebPage", "@id": url },
      "author": { "@type": "Organization", "name": "Advice-Only" },
      "_headings": { "h1": ch.title || '', "h2": lo.title || '', "h3": h3s }
    };
    seo[url] = Object.assign({}, base, overrides[url] || {});
  });
  if (ch.assessment) {
    const url = assessRoute(ci);
    const base = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "headline": (ch.assessment.title || 'Assessment') + ' — ' + (ch.title || ''),
      "description": "Chapter assessment",
      "mainEntityOfPage": { "@type": "WebPage", "@id": url },
      "author": { "@type": "Organization", "name": "Advice-Only" },
      "_headings": { "h1": ch.title || '', "h2": "Assessment", "h3": [] }
    };
    seo[url] = Object.assign({}, base, overrides[url] || {});
  }
});

fs.writeFileSync(outPath, JSON.stringify(seo, null, 2));
console.log(`[seo] wrote ${outPath}`);
