// scripts/merge_assessments.mjs
import fs from "fs";
const site = JSON.parse(fs.readFileSync("site.json", "utf8"));

site.chapters = (site.chapters || []).map((c) => {
  const chNum = c.title?.match(/Chapter\s+(\d+)/)?.[1];
  if (!chNum) return c;

  const src = `/data/assessments/assessment-ch${chNum}.json`;

  // read normalized JSON and inline it (renderer-safe)
  let data = null;
  try {
    data = JSON.parse(fs.readFileSync(`data/assessments/assessment-ch${chNum}.json`, "utf8"));
  } catch (e) {
    console.warn(`[warn] missing or unreadable ${src}:`, e.message);
  }

  const next = {
    ...c,
    assessment: {
      id: `assess-c${chNum}`,
      title: `Chapter ${chNum} Knowledge Check`,
      href: `/assess-c${chNum}`,
      src,       // keep external path for future
      data,      // inline for current renderer
    },
    items: Array.isArray(c.items) ? [...c.items] : [],
  };

  if (!next.items.some((it) => it && it.type === "assessment")) {
    next.items.push({ type: "assessment", title: `Chapter ${chNum} Knowledge Check`, href: `/assess-c${chNum}` });
  }
  return next;
});

fs.writeFileSync("site.json", JSON.stringify(site, null, 2));
console.log("[ok] merged (inline+src) assessments for chapters:",
  site.chapters.map((c) => c.title).join(", ")
);
