import fs from 'fs';

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

// Replace resolveAssessmentSrc() with a clean, known-good body
const assessFuncRe = /function\s+resolveAssessmentSrc\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/;
const assessFunc = `
function resolveAssessmentSrc(ref){
  try{
    const REG = window.REGISTRY || null;
    const map = REG?.assessments || {};
    // prefer registry mapping, otherwise fall back to data/
    const src = (map[ref]?.src) || \`data/assessments/\${ref}.json\`;
    return src;
  }catch(e){
    console.warn('[assess] resolveAssessmentSrc failed', e);
    return \`data/assessments/\${ref}.json\`;
  }
}
`;

if (assessFuncRe.test(html)) {
  html = html.replace(assessFuncRe, assessFunc);
} else {
  // If the helper isn't found, insert it just after extractTokenIndices()
  const anchor = /function\s+extractTokenIndices\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/;
  html = html.replace(anchor, m => m + '\n' + assessFunc + '\n');
}

// Also ensure resolveQuizSrc exists and is clean
const quizFuncRe = /function\s+resolveQuizSrc\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/;
const quizFunc = `
function resolveQuizSrc(ref){
  try{
    const REG = window.REGISTRY || null;
    const map = REG?.quizzes || {};
    const src = (map[ref]?.src) || \`data/quizzes/\${ref}.json\`;
    return src;
  }catch(e){
    console.warn('[quiz] resolveQuizSrc failed', e);
    return \`data/quizzes/\${ref}.json\`;
  }
}
`;
if (quizFuncRe.test(html)) {
  html = html.replace(quizFuncRe, quizFunc);
} else {
  const anchor = /function\s+extractTokenIndices\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/;
  html = html.replace(anchor, m => m + '\n' + quizFunc + '\n');
}

// Save
fs.writeFileSync(file, html);
console.log('[fix] helpers replaced OK');
