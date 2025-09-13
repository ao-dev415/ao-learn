import fs from 'node:fs';
function exists(p){ try { fs.accessSync(p); return true; } catch { return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, 'utf8')); }

const regPath = 'data/registry.json';
if (!exists(regPath)) {
  console.log('[validate] no data/registry.json found; skipping');
  process.exit(0);
}
const reg = readJSON(regPath);
const errs = [];
function check(p){ if (!exists(p)) errs.push('Missing file: ' + p); }

Object.entries(reg.quizzes || {}).forEach(([id, m])=> check(m?.src || `data/quizzes/${id}.json`));
Object.entries(reg.assessments || {}).forEach(([id, m])=> check(m?.src || `data/assessments/${id}.json`));

if (errs.length){ console.error('[validate] instrument problems:'); errs.forEach(e=>console.error(' -', e)); process.exit(1); }
console.log('[validate] instruments OK');
