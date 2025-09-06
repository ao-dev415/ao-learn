import fs from 'fs';

const path = 'site.json';
const site = JSON.parse(fs.readFileSync(path, 'utf8'));
site.chapters = Array.isArray(site.chapters) ? site.chapters : [];

if (!site.chapters.length) {
  console.error('No chapters found in site.json.');
  process.exit(1);
}

// --- target: Chapter 1, LO 1 ---
const ch = site.chapters[0];
ch.los = Array.isArray(ch.los) ? ch.los : [];
if (!ch.los.length) {
  console.error('Chapter 1 has no LOs.');
  process.exit(1);
}

const lo = ch.los[0];
lo.snippets = Array.isArray(lo.snippets) ? lo.snippets : [];

// Add quiz snippet only if not already present
const alreadyHasQuiz = lo.snippets.some(s => s && s.type === 'quiz');
if (!alreadyHasQuiz) {
  lo.snippets.push({
    type: "quiz",
    title: "Demo Quiz",
    quiz: { src: "/data/quizzes/quiz-demo.json" }
  });
  console.log('[inject] Added demo quiz to Chapter 1 LO 1');
} else {
  console.log('[inject] Chapter 1 LO 1 already has a quiz; skipping');
}

// Ensure assessment object exists and points to our demo
ch.assessment = ch.assessment || {};
ch.assessment.title = ch.assessment.title || "Demo Assessment";
ch.assessment.src = "/data/assessments/assessment-demo.json";
ch.assessment.href = ch.assessment.href || "/assess-c1";
ch.assessment.id = ch.assessment.id || "assess-c1";

fs.writeFileSync(path, JSON.stringify(site, null, 2));
console.log('[inject] Wired Chapter 1 assessment to /data/assessments/assessment-demo.json');
