// scripts/merge_assessments.mjs
import fs from "fs";

const site = JSON.parse(fs.readFileSync("site.json", "utf8"));

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { console.warn("[warn]", p, e.message); return null; }
}

site.chapters = (site.chapters || []).map((c) => {
  const chNum = c.title?.match(/Chapter\s+(\d+)/)?.[1];
  if (!chNum) return c;

  const rel = `data/assessments/assessment-ch${chNum}.json`; // on disk
  const src = `/data/assessments/assessment-ch${chNum}.json`; // served path
  const data = readJSON(rel); // normalized by normalize_assessments.mjs

  const assessment = {
    id: `assess-c${chNum}`,
    title: `Chapter ${chNum} Knowledge Check`,
    href: `/assess-c${chNum}`,
    src,          // external path (for fetch-based renderers)
    data,         // preferred inline
    json: data,   // legacy alias A
    survey: data, // legacy alias B
    schema: data, // legacy alias C
  };

  const items = Array.isArray(c.items) ? [...c.items] : [];
  if (!items.some((it) => it && it.type === "assessment")) {
    items.push({ type: "assessment", title: assessment.title, href: assessment.href });
  }

  return { ...c, assessment, items };
});

fs.writeFileSync("site.json", JSON.stringify(site, null, 2));
console.log("[ok] merged (inline + aliases + src) assessments across chapters.");
