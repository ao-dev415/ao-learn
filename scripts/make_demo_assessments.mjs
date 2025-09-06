// scripts/make_demo_assessments.mjs
import fs from "node:fs";
import path from "node:path";

const outDir = "data/assessments";
fs.mkdirSync(outDir, { recursive: true });

function demoAssessment(ch) {
  return {
    id: `assess-c${ch}`,
    title: `Chapter ${ch} Knowledge Check (Demo)`,
    description: "Demo assessment to verify wiring. Replace with real questions anytime.",
    $schema: "ao/assessment@1",
    pages: [
      {
        name: "page1",
        elements: [
          {
            type: "text",
            name: "topic",
            title: `In Chapter ${ch}, what topic stood out most?`
          },
          {
            type: "radiogroup",
            name: "mcq",
            title: "Quick check: 2 + 2 = ?",
            choices: ["3", "4", "5"],
            correctAnswer: "4"
          },
          {
            type: "rating",
            name: "confidence",
            title: "How confident do you feel about this chapter?",
            rateMin: 1,
            rateMax: 5
          }
        ]
      }
    ]
  };
}

for (let ch = 1; ch <= 9; ch++) {
  const obj = demoAssessment(ch);
  const file = path.join(outDir, `assessment-ch${ch}.json`);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  console.log("wrote", file);
}

console.log("[ok] demo assessments generated.");
