import fs from "fs";

const site = JSON.parse(fs.readFileSync("site.json", "utf-8"));

site.chapters = (site.chapters || []).map((c) => {
  const m = String(c.title || "").match(/Chapter\s+(\d+)/i);
  if (!m) return c;
  const chNum = m[1];
  const assessFile = `/data/assessments/assessment-ch${chNum}.json`; // NOTE: leading slash

  // attach assessment block and add a nav item
  const next = {
    ...c,
    assessment: {
      id: `assess-c${chNum}`,
      title: `Chapter ${chNum} Knowledge Check`,
      src: assessFile,
      href: `/assess-c${chNum}`,
    },
    items: Array.isArray(c.items) ? [...c.items] : [],
  };

  // only add a nav item if not already present
  if (!next.items.some((it) => it && it.type === "assessment")) {
    next.items.push({
      type: "assessment",
      title: `Chapter ${chNum} Knowledge Check`,
      href: `/assess-c${chNum}`,
    });
  }

  return next;
});

fs.writeFileSync("site.json", JSON.stringify(site, null, 2));
console.log("[ok] merged assessments (absolute paths) for chapters:",
  site.chapters.map((c) => c.title).join(", ")
);
