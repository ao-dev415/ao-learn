import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { JSDOM } from "jsdom";

const SRC_DOCX = process.argv[2] || "source/book.docx";
const OUT_JSON = process.argv[3] || "site.json";

// Load existing site.json to preserve metadata
function loadExisting() {
  try {
    const raw = fs.readFileSync(OUT_JSON, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function firstPreview(text) {
  const s = (text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const m = s.match(/^[^.!?]{20,200}?[.!?]/);
  return (m ? m[0] : s.slice(0, 160)).trim();
}

function normalizeText(el) {
  let t = el.textContent || "";
  return t.replace(/\u00A0/g, " ").trim();
}

function pushSnippet(lo, curSnippet) {
  if (!curSnippet) return;
  const body = curSnippet.parts.map(p => p.trim()).filter(Boolean).join("\n\n");
  if (!body) return;
  lo.snippets.push({ title: curSnippet.title || "Body", body });
}

function buildFromHtml(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const outChapters = [];

  let curCh = null;
  let curLo = null;
  let curSnippet = null;

  const nodes = [...doc.body.children];

  for (const el of nodes) {
    const tag = (el.tagName || "").toUpperCase();

    if (tag === "H1") {
      if (curSnippet && curLo) { pushSnippet(curLo, curSnippet); curSnippet = null; }
      curLo = null;
      curCh = { title: normalizeText(el), los: [] };
      outChapters.push(curCh);
      continue;
    }

    if (tag === "H2") {
      if (!curCh) {
        curCh = { title: "Chapter", los: [] };
        outChapters.push(curCh);
      }
      if (curSnippet && curLo) { pushSnippet(curLo, curSnippet); }
      curSnippet = null;

      curLo = { title: normalizeText(el), preview: "", snippets: [] };
      curCh.los.push(curLo);
      continue;
    }

    if (curLo && tag === "H3") {
      if (curSnippet) {
        pushSnippet(curLo, curSnippet);
      }
      curSnippet = { title: normalizeText(el), parts: [] };
      continue;
    }

    if (!curLo) continue;

    if (!curSnippet) curSnippet = { title: "Body", parts: [] };

    if (tag === "P") {
      const txt = normalizeText(el);
      if (txt) curSnippet.parts.push(txt);
      continue;
    }

    if (tag === "UL" || tag === "OL") {
      const items = [...el.querySelectorAll("li")].map(li => "• " + normalizeText(li));
      if (items.length) curSnippet.parts.push(items.join("\n"));
      continue;
    }

    if (tag === "TABLE") {
      const rows = [...el.querySelectorAll("tr")].map(tr =>
        [...tr.children].map(td => normalizeText(td)).join(" | ")
      );
      if (rows.length) curSnippet.parts.push(rows.join("\n"));
      continue;
    }
  }

  if (curSnippet && curLo) pushSnippet(curLo, curSnippet);

  for (const ch of outChapters) {
    for (const lo of (ch.los || [])) {
      const firstBody = lo.snippets?.[0]?.body || "";
      lo.preview = firstPreview(firstBody);
    }
  }

  return outChapters;
}

async function main() {
  if (!fs.existsSync(SRC_DOCX)) {
    console.error(`DOCX not found: ${SRC_DOCX}`);
    process.exit(2);
  }

  const { value: html } = await mammoth.convertToHtml({ path: SRC_DOCX }, { styleMap: [] });
  const chapters = buildFromHtml(html);

  const existing = loadExisting();
  const out = {
    title: existing.title || "Advice-Only® Learning Management System",
    about: existing.about || {
      name: "Your Name",
      location: "City, ST",
      bio: "Financial planner & educator.",
      specialties: ["Planning", "Behavior", "Retirement"],
      ctaUrl: "#",
      ctaLabel: "Work with me"
    },
    events: existing.events || [],
    chapters
  };

  const QUIZ_FILE = path.join(path.dirname(SRC_DOCX), "quizzes.json");
  if (fs.existsSync(QUIZ_FILE)) {
    const quizzes = JSON.parse(fs.readFileSync(QUIZ_FILE, "utf8"));

    for (const item of quizzes) {
      const chapter = out.chapters.find(c => c.title === item.chapter);
      if (!chapter) continue;

      if (item.id.startsWith("assess-")) {
        chapter.assessment = item.data;
      } else if (item.id.startsWith("quiz-")) {
        const lo = chapter.los.find(l => l.title === item.lo);
        if (lo) {
          lo.quiz = item.data;
        }
      }
    }

    console.log(`Merged quiz and assessment data from ${QUIZ_FILE}`);
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote ${OUT_JSON} from ${SRC_DOCX} (${chapters.length} chapters).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});