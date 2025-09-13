import fs from 'fs';

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

// 1) Remove any previous (possibly broken) helper block if present
html = html.replace(
  /\/\/ === AO token helpers \(resolvers\) ===[\s\S]*?\/\/ === END AO token helpers ===\s*/g,
  ''
);

// 2) Insert known-good resolver helpers just before the QUIZ & ASSESSMENT section
const helpersBlock = `
// === AO token helpers (resolvers) ===
function resolveAssessmentSrc(ref){
  try{
    const r = window.REGISTRY;
    const item = r && r.assessments && r.assessments[ref];
    return (item && (item.src || item.href)) || ('data/assessments/' + ref + '.json');
  }catch{
    return 'data/assessments/' + ref + '.json';
  }
}
function resolveQuizSrc(ref){
  try{
    const r = window.REGISTRY;
    const item = r && r.quizzes && r.quizzes[ref];
    return (item && (item.src || item.href)) || ('data/quizzes/' + ref + '.json');
  }catch{
    return 'data/quizzes/' + ref + '.json';
  }
}
// === END AO token helpers ===
`;

const quizAnchor = html.indexOf('// ---------- QUIZ & ASSESSMENT ----------');
if (quizAnchor !== -1 && !html.includes('resolveAssessmentSrc(')) {
  html = html.slice(0, quizAnchor) + helpersBlock + html.slice(quizAnchor);
}

// 3) Inject inline token rendering right after the strippedBody line
const strippedNeedle = `const strippedBody = s.body.replace(/\\[\\[(img|vid):\\d+\\]\\]/gi, '').trim();`;
const tokenBlock = `
          // Inline instrument tokens (assessment & quiz)
          try{
            const assessMatches = [...(s.body.matchAll(/\\[\\[assessment:([a-z0-9._-]+)\\]\\]/gi) || [])].map(m => m[1]);
            const quizMatches   = [...(s.body.matchAll(/\\[\\[quiz:([a-z0-9._-]+)\\]\\]/gi) || [])].map(m => m[1]);

            quizMatches.forEach(id => renderQuiz({ id, src: resolveQuizSrc(id) }, key));
            assessMatches.forEach(id => renderAssessment({ id, src: resolveAssessmentSrc(id) }, key));
          }catch(e){ console.warn('[tokens] parse failed', e); }
`;

if (html.includes(strippedNeedle) && !html.includes('parse failed')) {
  html = html.replace(strippedNeedle, strippedNeedle + tokenBlock);
}

fs.writeFileSync(file, html);
console.log('[patch] index.html fixed');
