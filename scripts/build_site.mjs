import fs from 'node:fs';
import path from 'node:path';

function exists(p){ try { fs.accessSync(p); return true; } catch { return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJSON(p, obj){ fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

function isV2(obj){ try { return obj && Array.isArray(obj.chapters) && Array.isArray(obj.chapters[0]?.sections); } catch { return false; } }

function patchPreAdapt(v2){
  (v2.chapters || []).forEach(ch => {
    if (!ch.assessment) {
      const sec = (ch.sections || []).find(s => (s.sub_objectives || []).some(so => so && so.type === 'assessment' && (so.assessment || so.src || so.ref)));
      if (sec) {
        const so = (sec.sub_objectives || []).find(x => x && x.type === 'assessment');
        const src = (so.assessment && so.assessment.src) || so.src || (so.ref ? `data/assessments/${so.ref}.json` : null);
        if (src) ch.assessment = { id: so.ref || so.assessment?.id || 'assessment', title: sec.title || 'Chapter Assessment', src };
      }
    }
    (ch.sections || []).forEach(sec => {
      (sec.sub_objectives || []).forEach(so => {
        if (so && so.type === 'quiz') {
          const src = so.src || (so.ref ? `data/quizzes/${so.ref}.json` : null);
          if (!so.quiz) so.quiz = {};
          if (!so.quiz.src) so.quiz.src = src;
        }
      });
    });
  });
  return v2;
}

function plain(s=''){
  return String(s)
    .replace(/```[\s\S]*?```/g,' ')
    .replace(/`([^`]+)`/g,'$1')
    .replace(/<\/?(p|strong|em|b|i|u|h\d|ul|ol|li|br|hr|div)[^>]*>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\*\*([^*]+)\*\*/g,'$1')
    .replace(/\*([^*]+)\*/g,'$1')
    .replace(/_([^_]+)_/g,'$1')
    .replace(/^\s*#+\s*/gm,'')
    .replace(/\s+/g,' ')
    .trim();
}

function adaptV2ToLegacy(v2){
  const out = { title: (v2.book && (v2.book.title || v2.book.id)) || (v2.title || ""), events: Array.isArray(v2.events) ? v2.events.slice() : [], chapters: [] };
  (v2.chapters || []).forEach(ch => {
    const legacyCh = { title: ch.title || ch.slug || 'Chapter', los: [] };
    if (ch.assessment) legacyCh.assessment = ch.assessment;
    (ch.sections || []).forEach(sec => {
      const lo = { title: sec.title || sec.h2_id || 'Learning Objective', preview: sec.preview_public_html || "", snippets: [] };
      if (sec.section_public_html) lo.snippets.push({ title: "Overview", body: plain(sec.section_public_html) });
      (sec.sub_objectives || []).forEach(so => {
        if ((so.type === 'quiz' || so.kind === 'quiz') && so.quiz) {
          lo.snippets.push({ type: 'quiz', title: so.title || 'Quick Check', quiz: so.quiz });
          return;
        }
        const vis = (so.visibility || 'gated');
        if (vis === 'public_inline') {
          lo.snippets.push({ title: so.title || '', body: plain(so.body_public_html || so.body || "") });
        } else if (vis === 'public_page') {
          const body = so.teaser_public ? plain(so.teaser_public) + (so.public_url ? ` (See: ${so.public_url})` : "") : (so.public_url ? `Read more: ${so.public_url}` : "");
          lo.snippets.push({ title: so.title || '', body });
        } else {
          if (so.teaser_public) lo.snippets.push({ title: so.title || '', body: plain(so.teaser_public) });
          else lo.snippets.push({ title: so.title || '', body: "(Gated content)" });
        }
      });
      legacyCh.los.push(lo);
    });
    out.chapters.push(legacyCh);
  });
  return out;
}

// Public redaction (keeps your gating intact)
function readPublicConfig(){
  try { return JSON.parse(fs.readFileSync('content/public.config.json','utf8')); }
  catch { return { includeQuizzes: true, includeAssessments: false, keepGatedSnippets: true, stripBodiesOver: 2000 }; }
}

function redactForPublic(site, cfg){
  const copy = JSON.parse(JSON.stringify(site));
  (copy.chapters||[]).forEach(ch => {
    if (!cfg.includeAssessments) delete ch.assessment;
    (ch.los||[]).forEach(lo => {
      lo.snippets = (lo.snippets||[]).filter(s => {
        if (s?.type === 'assessment') return false;
        if (s?.type === 'quiz') return !!cfg.includeQuizzes;
        if (s?.body === '(Gated content)' && !cfg.keepGatedSnippets) return false;
        return true;
      }).map(s => {
        if (s?.body && typeof s.body === 'string' && cfg.stripBodiesOver && s.body.length > cfg.stripBodiesOver) {
          s.body = s.body.slice(0, cfg.stripBodiesOver) + '…';
        }
        return s;
      });
    });
  });
  return copy;
}

function copyDataFolder(){
  if (!exists('data')) return;
  const dst = 'dist/data';
  fs.mkdirSync(dst, { recursive: true });
  const cp = (src, dest) => {
    fs.mkdirSync(dest, { recursive: true });
    for (const e of fs.readdirSync(src)) {
      const s = path.join(src, e);
      const d = path.join(dest, e);
      const st = fs.statSync(s);
      if (st.isDirectory()) cp(s, d);
      else fs.copyFileSync(s, d);
    }
  };
  cp('data', dst);
}

function main(){
  let src = 'content/site.v2.json';
  if (!exists(src)) src = 'site.json';
  if (!exists(src)) throw new Error('No content/site.v2.json or site.json found.');

  let site = readJSON(src);
  if (isV2(site)) {
    try { site = patchPreAdapt(site); } catch(e){ console.warn('[build] preAdapt failed:', e.message); }
    site = adaptV2ToLegacy(site);
    console.log('[build] adapted v2 → legacy');
  } else {
    console.log('[build] legacy site.json passthrough');
  }

  // full
  writeJSON('dist/full/site.json', site);

  // public (redacted)
  const cfg = readPublicConfig();
  const pub = redactForPublic(site, cfg);
  writeJSON('dist/public/site.json', pub);

  // copies for viewer/Pages
  try { fs.copyFileSync('dist/public/site.json', 'site.json'); } catch {}
  fs.mkdirSync('full', { recursive: true });
  try { fs.copyFileSync('dist/full/site.json', 'full/site.json'); } catch {}

  copyDataFolder();
  console.log('[build] wrote dist/full/site.json, dist/public/site.json, site.json, full/site.json');
}

try { main(); } catch (e) { console.error(e); process.exit(1); }
