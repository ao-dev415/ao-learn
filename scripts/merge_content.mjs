// Hardened merge_content.mjs
// Merges content/json/*.public.json + *.private.json into dist/site.json & site.v2.json
// Tolerates partially-filled files (missing chapter object, ids, etc.) and logs warnings.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '..', 'content', 'json');
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const PROJECT_ROOT = path.resolve(__dirname, '..');

const slugify = (s='') => String(s).normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-').toLowerCase();
async function loadJSON(p){ return JSON.parse(await fs.readFile(p,'utf8')); }
async function safeReaddir(dir){ try { return await fs.readdir(dir); } catch { return []; } }

function warn(msg){ console.warn(`[merge] ${msg}`); }

async function main(){
  await fs.mkdir(DIST_DIR, { recursive: true });

  const files = (await safeReaddir(CONTENT_DIR)).filter(f => f.endsWith('.json'));
  const publics = files.filter(f => f.endsWith('.public.json')).sort();
  const privates = files.filter(f => f.endsWith('.private.json')).sort();

  if (publics.length === 0) {
    warn(`No *.public.json files found in ${CONTENT_DIR}. Writing empty shell.`);
  }

  // Load privates indexed by chapter_id
  const privateByChapter = new Map();
  for (const file of privates){
    try {
      const data = await loadJSON(path.join(CONTENT_DIR, file));
      if (!data || !data.chapter_id) {
        warn(`Private file ${file} missing "chapter_id" — skipping private merge for it.`);
        continue;
      }
      privateByChapter.set(data.chapter_id, data);
    } catch (e) {
      warn(`Failed to parse private ${file}: ${e.message}`);
    }
  }

  const outV2 = { version: '2.0', book: null, chapters: [], private_lookup: {} };

  for (const file of publics){
    let pub;
    try { pub = await loadJSON(path.join(CONTENT_DIR, file)); }
    catch (e) { warn(`Failed to parse public ${file}: ${e.message}`); continue; }

    // Book defaults
    if (!outV2.book) {
      if (pub.book && (pub.book.title || pub.book.id)) {
        outV2.book = {
          id: pub.book.id || slugify(pub.book.title || 'book'),
          title: pub.book.title || pub.book.id || 'Book',
          slug: pub.book.slug || slugify(pub.book.title || pub.book.id || 'book')
        };
      } else {
        outV2.book = { id: 'book', title: 'Book', slug: 'book' };
        warn(`Public ${file} missing "book"; using defaults.`);
      }
    }

    const base = path.basename(file, '.public.json');
    const chObj = pub.chapter || {};
    const chId = chObj.id || pub.chapter_id || base || `ch-${outV2.chapters.length+1}`;
    const chTitle = chObj.title || pub.chapter_title || base || `Chapter ${outV2.chapters.length+1}`;
    const chSlug = chObj.slug || slugify(chTitle);
    const chPublicUrl = chObj.public_url || `/${outV2.book.slug}/${chSlug}/`;

    const ch = {
      id: chId,
      title: chTitle,
      slug: chSlug,
      public_url: chPublicUrl,
      intro_public_html: chObj.intro_public_html || '',
      intro_public_format: chObj.intro_public_format || 'markdown',
      sections: Array.isArray(pub.sections) ? pub.sections.map((sec, i) => {
        const sTitle = sec?.title || `Section ${i+1}`;
        const sId = sec?.h2_id || slugify(sTitle);
        const sUrl = sec?.public_url || `${chPublicUrl}${sId}/`;
        const sPreview = sec?.preview_public_html || '';
        const sPreviewFmt = sec?.preview_public_format || 'html';
        const sBody = sec?.section_public_html || '';
        const sBodyFmt = sec?.section_public_format || 'markdown';

        const subs = Array.isArray(sec?.sub_objectives) ? sec.sub_objectives.map((so, j) => ({
          h3_id: so?.h3_id || slugify(so?.title || `h3-${j+1}`),
          title: so?.title || `Sub-objective ${j+1}`,
          visibility: so?.visibility || 'gated',
          teaser_public: so?.teaser_public || '',
          body_public_html: so?.body_public_html || '',
          h3_body_public_format: so?.h3_body_public_format || (so?.body_public_html ? 'markdown' : undefined),
          public_url: so?.public_url || undefined
        })) : [];

        return {
          h2_id: sId,
          title: sTitle,
          public_url: sUrl,
          preview_public_html: sPreview,
          preview_public_format: sPreviewFmt,
          section_public_html: sBody,
          section_public_format: sBodyFmt,
          sub_objectives: subs
        };
      }) : []
    };

    // Private lookup by computed chId
    const chPriv = privateByChapter.get(chId);
    if (chPriv){
      const lookup = {};
      for (const sec of (chPriv.sections || [])){
        const keyH2 = sec?.h2_id;
        if (!keyH2) continue;
        lookup[keyH2] = lookup[keyH2] || {};
        for (const so of (sec?.sub_objectives || [])){
          if (!so?.h3_id) continue;
          lookup[keyH2][so.h3_id] = {
            title: so.title || '',
            body_private_html: so.body_private_html || '',
            h3_body_private_format: so.h3_body_private_format || 'markdown'
          };
        }
      }
      outV2.private_lookup[chId] = lookup;
    } else {
      // Not an error — you may not have private content yet
    }

    outV2.chapters.push(ch);
  }

  // If we ended with no chapters, still write a shell so the app loads
  if (!Array.isArray(outV2.chapters) || outV2.chapters.length === 0){
    outV2.book = outV2.book || { id:'book', title:'Book', slug:'book' };
    outV2.chapters = [];
  }

  const v2Path = path.join(DIST_DIR, 'site.v2.json');
  await fs.writeFile(v2Path, JSON.stringify(outV2, null, 2), 'utf8');

  const legacyPath = path.join(DIST_DIR, 'site.json');
  await fs.writeFile(legacyPath, JSON.stringify(outV2, null, 2), 'utf8');

  // Also write to project root for existing pathing
  const rootSite = path.join(PROJECT_ROOT, 'site.json');
  await fs.writeFile(rootSite, JSON.stringify(outV2, null, 2), 'utf8');

  console.log('Wrote', v2Path);
  console.log('Wrote', legacyPath);
  console.log('Also wrote', rootSite);
}

main().catch(err=>{ console.error(err); process.exit(1); });
