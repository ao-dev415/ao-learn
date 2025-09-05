import { readFileSync, writeFileSync, readdirSync } from 'fs';
import path from 'path';

const SITE_PATH = 'site.json';
const ASSESS_DIR = 'data/assessments';

function readJSON(p) { return JSON.parse(readFileSync(p, 'utf8')); }

function getChapterNumber(ch) {
  if (typeof ch.index === 'number') return ch.index;
  if (typeof ch.chapterIndex === 'number') return ch.chapterIndex;
  const t = String(ch.title || '');
  const m = t.match(/Chapter\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function loadAssessments(dir) {
  let files = [];
  try { files = readdirSync(dir); } catch { files = []; }
  const map = new Map();
  for (const f of files) {
    const m = f.match(/^assessment-ch(\d+)\.json$/i);
    if (!m) continue;
    const chNum = parseInt(m[1], 10);
    const full = path.join(dir, f);
    try {
      const data = readJSON(full);
      const title = (data?.data?.title) || `Chapter ${chNum} Knowledge Check`;
      const id = data?.id || `assess-c${chNum}`;
      map.set(chNum, { id, title, file: `/${dir}/${f}`.replace(/^\/+/, '/') });
    } catch { /* skip malformed */ }
  }
  return map;
}

function main() {
  const site = readJSON(SITE_PATH);
  const chapters = site.chapters || site.Chapters || [];
  const am = loadAssessments(ASSESS_DIR);

  for (const ch of chapters) {
    const num = getChapterNumber(ch);
    if (!num) continue;
    const a = am.get(num);
    if (!a) continue;

    if (!ch.assessment) {
      ch.assessment = {
        id: a.id,
        title: a.title,
        href: `/assess/ch${String(num)}`,   // adjust if your route differs
        src: a.file
      };
    }

    // If your nav uses an items array, add a visible entry
    if (!Array.isArray(ch.items)) ch.items = ch.items ? Array.from(ch.items) : [];
    const already = ch.items.some(it => it && it.type === 'assessment');
    if (!already) ch.items.push({ type: 'assessment', title: ch.assessment.title, href: ch.assessment.href });
  }

  writeFileSync(SITE_PATH, JSON.stringify(site, null, 2));
  const listed = (chapters || []).filter(c => c.assessment).map(c => c.title || c.index);
  console.log('[ok] merged assessments into site.json for chapters:', listed.join(', '));
}
main();
