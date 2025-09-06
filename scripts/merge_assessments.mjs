// scripts/merge_assessments.mjs
import fs from "fs";

const site = JSON.parse(fs.readFileSync("site.json", "utf-8"));

// Walk chapters and inject their assessment reference
site.chapters = site.chapters.map((c) => {
  const match = c.title.match(/Chapter (\d+)/);
  if (!match) return c;

  const chNum = match[1];
  const assessFile = `data/assessments/assessment-ch${chNum}.json`;

  return {
    ...c,
    assessment: {
      id: `assess-c${chNum}`,
      title: `Chapter ${chNum} Knowledge Check`,
      src: assessFile,
      href: `/assess-c${chNum}`,
    },
    items: [
      ...(c.items || []),
      {
        type: "assessment",
        title: `Chapter ${chNum} Knowledge Check`,
        href: `/assess-c${chNum}`,
      },
    ],
  };
});

fs.writeFileSync("site.json", JSON.stringify(site, null, 2));
console.log(
  "[ok] merged assessments into site.json for chapters:",
  site.chapters.map((c) => c.title).join(", ")
);
