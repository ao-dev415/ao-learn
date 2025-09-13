import fs from 'node:fs';

const EMBED = process.env.AO_EMBED === '1' || process.env.AO_EMBED === 'true';

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

const sitePath = fs.existsSync('content/site.v2.json') ? 'content/site.v2.json' : 'site.v2.json';
const regPath  = fs.existsSync('data/registry.json')   ? 'data/registry.json'   : 'data/registry.sample.json';

const site = readJSON(sitePath);
const reg  = readJSON(regPath);

function resolveAssessment(ref) {
  const r = reg.assessments?.[ref];
  if (!r) throw new Error(`Missing assessment ref: ${ref}`);
  const data = EMBED ? readJSON(r.src.replace(/^\//, '')) : undefined;
  return { id: ref, src: r.src, version: r.version, data };
}
function resolveQuiz(ref) {
  const r = reg.quizzes?.[ref];
  if (!r) throw new Error(`Missing quiz ref: ${ref}`);
  const data = EMBED ? readJSON(r.src.replace(/^\//, '')) : undefined;
  return { id: ref, src: r.src, version: r.version, data };
}

const out = { chapters: [] };

for (const ch of site.chapters || []) {
  const legacyCh = { ...ch, items: Array.isArray(ch.items) ? [...ch.items] : [] };
  let promoted = null;

  for (const sec of ch.sections || []) {
    // Promote first assessment to chapter.assessment
    if (!promoted) {
      const so = (sec.sub_objectives || []).find(x => x?.type === 'assessment' && x.ref);
      if (so) {
        const a = resolveAssessment(so.ref);
        promoted = {
          id: a.id,
          title: sec.title || 'Knowledge Check',
          href: `/${a.id}`,
          src: a.src,
          version: a.version,
          ...(EMBED && a.data ? { data: a.data } : {})
        };
      }
    }

    // Normalize quizzes: attach refs/src (optionally embed)
    sec.sub_objectives = (sec.sub_objectives || []).map(x => {
      if (x?.type === 'quiz' && x.ref) {
        const q = resolveQuiz(x.ref);
        return {
          ...x,
          quizRef: q.id,
          quizSrc: q.src,
          quizVersion: q.version,
          ...(EMBED && q.data ? { quizData: q.data } : {})
        };
      }
      return x;
    });
  }

  // Idempotent assignment of chapter.assessment
  if (promoted) {
    if (!legacyCh.assessment || legacyCh.assessment.src !== promoted.src) {
      legacyCh.assessment = promoted;
    }
    if (!legacyCh.items.some(it => it?.type === 'assessment')) {
      legacyCh.items.push({ type: 'assessment', title: legacyCh.assessment.title, href: legacyCh.assessment.href });
    }
  }

  out.chapters.push(legacyCh);
}

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/site.json', JSON.stringify(out, null, 2));
console.log('Wrote dist/site.json' + (EMBED ? ' (embedded instruments)' : ''));
