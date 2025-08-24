#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
import_docx.py  —  Build site.json + RAG from DOCX (H1/H2/H3 model)

- H1   => Chapter
- H2   => LO
- H3   => Optional snippet title inside an LO
- Body => Paragraphs under an LO (before the next H2/H1). If no H3s are present
          we take the first N paragraphs and place them in one snippet.

Usage (same flags you’re already using):

python3 scripts/import_docx.py \
  --src source \
  --out site.json \
  --rag static/rag/chunks.json \
  --media static/media \
  --book "Advice Only™ Methodology (2024)" \
  --max-paras 4 \
  --verbose
"""

import argparse
import json
import os
import re
from pathlib import Path

try:
    from docx import Document
except Exception as e:
    raise SystemExit(
        "Missing dependency: python-docx\n"
        "Install:  python3 -m pip install python-docx\n"
    )

ROOT = Path(__file__).resolve().parent.parent
TMP_HTML = ROOT / "tmp_html"       # previews (lightweight)
DEFAULT_MAX_PARAS = 4              # first N paragraphs per LO when no H3s

HEADING_RE = re.compile(r"^Heading\s+(\d+)$", re.I)
NUM_LO_RE  = re.compile(r"\b(\d+\.\d+)\b")

def norm(s: str) -> str:
    return (s or "").strip()

def is_heading(p):
    """Return heading level int if paragraph is Heading 1/2/3..., else 0."""
    try:
        st = p.style.name or ""
    except Exception:
        return 0
    m = HEADING_RE.match(st)
    return int(m.group(1)) if m else 0

def para_text(p):
    t = p.text.replace("\xa0", " ").strip()
    # ignore pure whitespace or page-number like decorations
    return t

def chunker(text: str, size: int = 500, overlap: int = 60):
    """Simple character-based chunker for RAG; conservative overlap."""
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    out, i = [], 0
    while i < len(text):
        out.append(text[i:i+size])
        i += (size - overlap)
    return out

def parse_docx(fp: Path, max_paras: int, verbose: bool=False):
    """Return a list of (chapter dicts) extracted from a single docx."""
    doc = Document(str(fp))

    chapters = []
    cur_ch = None
    cur_lo = None
    cur_snip = None

    # helpers
    def start_ch(title):
        nonlocal cur_ch, cur_lo, cur_snip
        if verbose: print(f"… new chapter: {title}")
        cur_ch = {"title": norm(title), "los": []}
        chapters.append(cur_ch)
        cur_lo = None
        cur_snip = None

    def start_lo(title):
        nonlocal cur_lo, cur_snip
        if verbose: print(f"    … LO: {title}")
        cur_lo = {"title": norm(title), "preview": "", "snippets": []}
        cur_ch["los"].append(cur_lo)
        cur_snip = None

    def start_snip(title):
        nonlocal cur_snip
        cur_snip = {"title": norm(title) or "Body", "body": ""}
        cur_lo["snippets"].append(cur_snip)

    # pass 1: walk paragraphs
    for p in doc.paragraphs:
        lvl = is_heading(p)
        txt = para_text(p)
        if not (txt or lvl):
            continue

        if lvl == 1:                     # Chapter
            start_ch(txt)
            continue

        if lvl == 2:                     # LO
            if cur_ch is None:           # safety: LO before any chapter
                start_ch("Untitled Chapter")
            start_lo(txt)
            continue

        if lvl == 3 and cur_lo is not None:  # Snippet title
            start_snip(txt)
            continue

        # plain paragraph
        if cur_lo is None:
            # ignore text outside an LO
            continue

        if not cur_lo["preview"]:        # first text inside LO becomes preview
            cur_lo["preview"] = txt

        if cur_snip is None:
            # we haven't seen an H3; put paragraph under implicit "Body"
            if not cur_lo["snippets"]:
                start_snip("Body")
            cur_snip = cur_lo["snippets"][-1]

        # append with newlines between paragraphs
        cur_snip["body"] = (cur_snip["body"] + "\n\n" + txt).strip()

    # pass 2: if an LO ended up with huge body and no H3s, keep first N paras
    for ch in chapters:
        for lo in ch["los"]:
            if not lo["snippets"]:
                continue
            only = (len(lo["snippets"]) == 1 and lo["snippets"][0]["title"] == "Body")
            if only:
                paras = [x.strip() for x in lo["snippets"][0]["body"].split("\n\n") if x.strip()]
                kept = paras[:max_paras]
                lo["snippets"][0]["body"] = "\n\n".join(kept)

    # optional: write tiny HTML previews for sanity
    try:
        TMP_HTML.mkdir(parents=True, exist_ok=True)
        for i, ch in enumerate(chapters, 1):
            safe = re.sub(r"[^a-z0-9]+", "-", ch["title"].lower()).strip("-") or f"ch{i}"
            out = TMP_HTML / f"({i:04d}) {safe}.html"
            with out.open("w", encoding="utf-8") as f:
                f.write(f"<h1>{ch['title']}</h1>\n")
                for lo in ch["los"]:
                    f.write(f"<h2>{lo['title']}</h2>\n<p><em>{lo['preview']}</em></p>\n")
                    for s in lo["snippets"]:
                        if s["title"]:
                            f.write(f"<h3>{s['title']}</h3>\n")
                        f.write(f"<p>{s['body']}</p>\n")
    except Exception:
        pass

    return chapters

def build_rag(chapters):
    items = []
    idx = 0
    for ci, ch in enumerate(chapters, 1):
        for li, lo in enumerate(ch["los"], 1):
            base_meta = {
                "chapter": ch["title"],
                "lo": lo["title"],
                "loc": f"ch{ci}-lo{li}",
            }
            # Include preview
            if lo.get("preview"):
                for c in chunker(lo["preview"]):
                    items.append({"id": f"snip-{idx}", "text": c, **base_meta})
                    idx += 1
            # Include snippets
            for s in lo.get("snippets", []):
                payload = s.get("body", "")
                for c in chunker(payload):
                    obj = {"id": f"snip-{idx}", "text": c, **base_meta}
                    if s.get("title"):
                        obj["snippet"] = s["title"]
                    items.append(obj)
                    idx += 1
    return {"count": len(items), "items": items}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="folder containing .docx")
    ap.add_argument("--out", required=True, help="site.json output path")
    ap.add_argument("--rag", required=True, help="rag json output path")
    ap.add_argument("--media", required=False, help="(reserved) media folder")
    ap.add_argument("--book", default="Advice Only™ Methodology (2024)")
    ap.add_argument("--max-paras", type=int, default=DEFAULT_MAX_PARAS)
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    src = Path(args.src)
    out = Path(args.out)
    rag = Path(args.rag)

    docx_paths = []
    if src.is_dir():
        for p in sorted(src.glob("*.docx")):
            docx_paths.append(p)
        # also support nested: source/2024-test/*.docx
        for p in sorted(src.glob("*/*.docx")):
            docx_paths.append(p)

    if not docx_paths:
        print("[!] No .docx in source")
        return

    if args.verbose:
        for i, p in enumerate(docx_paths, 1):
            print(f"… parsing ch{i}: {p.name}")

    chapters = []
    for p in docx_paths:
        chapters.extend(parse_docx(p, args.max_paras, verbose=args.verbose))

    site = {
        "book": args.book,
        "chapters": chapters
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        json.dump(site, f, ensure_ascii=False, indent=2)
    print(f"[ok] Wrote {out}: {len(chapters)} chapters, {sum(len(c['los']) for c in chapters)} LOs")

    rag.parent.mkdir(parents=True, exist_ok=True)
    rag_obj = build_rag(chapters)
    with rag.open("w", encoding="utf-8") as f:
        json.dump(rag_obj, f, ensure_ascii=False, indent=2)
    print(f"[ok] Wrote {rag}: {rag_obj['count']} snippets")

    print(f"[i] Previews in {TMP_HTML}")

if __name__ == "__main__":
    main()
