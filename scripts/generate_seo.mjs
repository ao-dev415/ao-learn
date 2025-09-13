import fs from 'node:fs';
import path from 'node:path';

const full = JSON.parse(fs.readFileSync('dist/full/site.json', 'utf8'));
const outPath = path.join('dist', 'seo.json');

function routeFor(ci, li) { return `#ch${ci+1}-lo${li+1}`; }
function strip(s=''){ return String(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }

const map = {};

(full.chapters||[]).forEach((ch,ci)=>{
  (ch.los||[]).forEach((lo,li)=>{
    const url = routeFor(ci,li);
    const name = lo.title || `Learning Objective ${ci+1}.${li+1}`;
    const desc = strip(lo.preview || lo.snippets?.[0]?.body || '');
    map[url] = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": name,
      "description": desc,
      "mainEntityOfPage": { "@type": "WebPage", "@id": url },
      "author": { "@type": "Organization", "name": "Advice-Only" }
    };
  });
});

fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
console.log(`[seo] wrote ${outPath}`);
