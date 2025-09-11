#!/usr/bin/env node
import fs from "node:fs";
const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) { console.error("usage: node scripts/compat_aliases.mjs in.json out.json"); process.exit(1); }
const site = JSON.parse(fs.readFileSync(inFile, "utf8"));
for (const ch of site.chapters || []) {
  if (!Array.isArray(ch.sections)) ch.sections = [];
  ch.sections = ch.sections.map((s, i) => {
    const id = s.id ?? s.section_id ?? s.h2_id ?? (s.slug ? s.slug : `s${String(i+1).padStart(2,"0")}`);
    const public_html = s.public_html ?? s.section_public_html ?? s.preview_public_html ?? "";
    const public_format = s.public_format ?? s.section_public_format ?? s.preview_public_format ?? "markdown";
    const slug = s.slug ?? String(id).toLowerCase().replace(/[^\w]+/g,"-").replace(/(^-|-$)/g,"");
    const title = s.title ?? s.h2 ?? s.h2_title ?? `Section ${i+1}`;
    return { ...s, id, section_id: id, slug, title, public_html, public_format };
  });
}
fs.writeFileSync(outFile, JSON.stringify(site, null, 2));
console.log(`[ok] compat aliases added → ${outFile}`);
