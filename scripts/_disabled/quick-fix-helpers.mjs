import fs from 'fs';

const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');

// ---- replace helper functions without using template strings ----
function replaceFunction(name, body) {
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}', 'm');
  if (re.test(html)) {
    html = html.replace(re, body);
  } else {
    // if not found, inject right after extractTokenIndices()
    const anchor = /function\s+extractTokenIndices\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/m;
    html = html.replace(anchor, (m) => m + '\n' + body + '\n');
  }
}

const assessBody =
'function resolveAssessmentSrc(ref){\n' +
'  try {\n' +
'    const REG = window.REGISTRY || {};\n' +
'    const map = (REG.assessments || {});\n' +
'    const src = map[ref] && map[ref].src;\n' +
'    return src || "data/assessments/" + ref + ".json";\n' +
'  } catch(e){\n' +
'    console.warn("[helpers] resolveAssessmentSrc fallback", e);\n' +
'    return "data/assessments/" + ref + ".json";\n' +
'  }\n' +
'}';

const quizBody =
'function resolveQuizSrc(ref){\n' +
'  try {\n' +
'    const REG = window.REGISTRY || {};\n' +
'    const map = (REG.quizzes || {});\n' +
'    const src = map[ref] && map[ref].src;\n' +
'    return src || "data/quizzes/" + ref + ".json";\n' +
'  } catch(e){\n' +
'    console.warn("[helpers] resolveQuizSrc fallback", e);\n' +
'    return "data/quizzes/" + ref + ".json";\n' +
'  }\n' +
'}';

replaceFunction('resolveAssessmentSrc', assessBody);
replaceFunction('resolveQuizSrc',     quizBody);

// ---- remove any stray line like:   .json'   or   .json"; ----
html = html
  .split('\n')
  .filter(line => !/^\s*\.json['"]?;?\s*$/.test(line))
  .join('\n');

fs.writeFileSync(file, html);
console.log('[fix] helpers replaced and stray .json line(s) removed');
