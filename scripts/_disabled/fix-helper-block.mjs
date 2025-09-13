import fs from 'fs';

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

// Replace the entire helpers block (resolveAssessmentSrc + resolveQuizSrc)
// with a known-good implementation.
const helpersRe = /function\s+resolveAssessmentSrc\s*\([^)]*\)\s*\{[\s\S]*?\}\s*function\s+resolveQuizSrc\s*\([^)]*\)\s*\{[\s\S]*?\}/m;

const helpersClean = `
function resolveAssessmentSrc(ref){
  try {
    const REG = window.REGISTRY || {};
    const map = (REG.assessments || {});
    const src = map[ref]?.src;
    return src || \`data/assessments/\${ref}.json\`;
  } catch(e){
    console.warn('[helpers] resolveAssessmentSrc fallback', e);
    return \`data/assessments/\${ref}.json\`;
  }
}

function resolveQuizSrc(ref){
  try {
    const REG = window.REGISTRY || {};
    const map = (REG.quizzes || {});
    const src = map[ref]?.src;
    return src || \`data/quizzes/\${ref}.json\`;
  } catch(e){
    console.warn('[helpers] resolveQuizSrc fallback', e);
    return \`data/quizzes/\${ref}.json\`;
  }
}
`;

if (helpersRe.test(html)) {
  html = html.replace(helpersRe, helpersClean.trim());
} else {
  // If the two functions are not adjacent, patch them one by one.
  const oneFn = (name, body) => {
    const re = new RegExp(\`function\\\\s+\${name}\\\\s*\\\\([^)]*\\\\)\\\\s*\\\\{[\\\\s\\\\S]*?\\\\}\`, 'm');
    if (re.test(html)) html = html.replace(re, body.trim());
    else html = html.replace(/function\s+extractTokenIndices\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/m,
      m => m + '\n' + body.trim() + '\n');
  };
  oneFn('resolveAssessmentSrc', helpersClean.match(/function resolveAssessmentSrc[\s\S]*?\}/)[0]);
  oneFn('resolveQuizSrc', helpersClean.match(/function resolveQuizSrc[\s\S]*?\}/)[0]);
}

fs.writeFileSync(file, html);
console.log('[fix] helper block replaced OK');
