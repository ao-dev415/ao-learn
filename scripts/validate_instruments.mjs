import fs from 'node:fs';
import path from 'node:path';

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch(e) { throw new Error(`Failed to read ${p}: ${e.message}`); }
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

const registryPath = 'data/registry.json';
if (!exists(registryPath)) {
  console.log('[validate] no data/registry.json found; skipping registry validation');
  process.exit(0);
}
const reg = readJSON(registryPath);

const errs = [];

function checkFile(p) {
  if (!exists(p)) errs.push(`Missing file: ${p}`);
}

Object.entries(reg.quizzes || {}).forEach(([id, meta]) => {
  const src = meta?.src || `data/quizzes/${id}.json`;
  checkFile(src);
});
Object.entries(reg.assessments || {}).forEach(([id, meta]) => {
  const src = meta?.src || `data/assessments/${id}.json`;
  checkFile(src);
});

if (errs.length) {
  console.error('[validate] instrument problems:');
  errs.forEach(e => console.error(' -', e));
  process.exit(1);
} else {
  console.log('[validate] instruments OK');
}
