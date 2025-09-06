import fs from "fs";
import path from "path";

const DIR = "data/assessments";
const files = fs.existsSync(DIR)
  ? fs.readdirSync(DIR).filter(f => /^assessment-ch\d+\.json$/.test(f))
  : [];

let changed = 0;
for (const f of files) {
  const p = path.join(DIR, f);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {
    console.warn(`[warn] skipped ${f}: invalid JSON`);
    continue;
  }

  // Unwrap legacy { data: {...} } shape if present
  const src = (raw && raw.data && (raw.data.pages || raw.data.elements))
    ? raw.data
    : raw || {};

  // Normalize into SurveyJS "pages" format
  let out;
  if (Array.isArray(src.pages)) {
    out = { title: src.title || "", description: src.description || "", pages: src.pages };
  } else {
    const elements = Array.isArray(src.elements) ? src.elements : [];
    out = {
      title: src.title || "",
      description: src.description || "",
      pages: [{ name: "page1", elements }]
    };
  }

  // Stamp a schema/version so we can evolve later
  out.$schema = "ao/assessment@1";

  const before = JSON.stringify(raw);
  const after  = JSON.stringify(out);
  if (before !== after) {
    fs.writeFileSync(p, JSON.stringify(out, null, 2));
    changed++;
    console.log(`[fix] normalized ${f}`);
  }
}

console.log(`[ok] normalization complete; files changed: ${changed}`);
