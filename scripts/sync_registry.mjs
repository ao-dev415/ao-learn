import fs from 'node:fs';
import path from 'node:path';
function list(d){ try { return fs.readdirSync(d).filter(f=>!f.startsWith('.')); } catch { return []; } }
const quizzes={}, assessments={};
for(const f of list('data/quizzes')) if(/\.json$/i.test(f)) quizzes[f.replace(/\.json$/,'')]={src:`data/quizzes/${f}`};
for(const f of list('data/assessments')) if(/\.json$/i.test(f)) assessments[f.replace(/\.json$/,'')]={src:`data/assessments/${f}`};
const reg={quizzes, assessments};
fs.mkdirSync('data',{recursive:true});
fs.writeFileSync('data/registry.json', JSON.stringify(reg,null,2));
console.log(`[registry] wrote data/registry.json with ${Object.keys(quizzes).length} quizzes and ${Object.keys(assessments).length} assessments`);
