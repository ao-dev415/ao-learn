import fs from 'fs';

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

// Replace the entire extractTokenIndices(...) with a clean version
const extractRe = /function\s+extractTokenIndices\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/m;
const extractClean = `
function extractTokenIndices(text, token){
  const re = token === 'img'
    ? /\\[\\[img:(\\d+)\\]\\]/gi
    : /\\[\\[vid:(\\d+)\\]\\]/gi;
  const inds = [];
  (text || '').replace(re, (_, n) => {
    inds.push(Math.max(1, parseInt(n, 10)) - 1);
    return '';
  });
  return inds;
}
`;

if (extractRe.test(html)) {
  html = html.replace(extractRe, extractClean);
} else {
  console.warn('[fix] extractTokenIndices not found — no change made');
}

fs.writeFileSync(file, html);
console.log('[fix] extractTokenIndices replaced OK');
