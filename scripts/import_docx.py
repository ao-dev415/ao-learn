#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
import_docx.py (v2)
- Ingests all .docx in a folder
- H1 = Chapter, H2 = Learning Objective, H3 = Snippet (fallback: bold-only paragraph)
- Extracts images from DOCX and associates them to nearest LO
- Writes:
    site.json                (drives the UI)
    static/rag/chunks.json   (drives snippet search)
    tmp_html/*.html         (quick visual sanity check)
"""
import argparse, json, os, re, shutil, zipfile, html
from pathlib import Path
from collections import defaultdict
from datetime import datetime

from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE

# ---------- helpers

def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or 'x'

def is_heading(p, level: int) -> bool:
    name = (p.style.name or '').lower()
    return name in {f'heading {level}', f'heading{level}'}

def is_bold_line(p) -> bool:
    # Treat a paragraph as a "bold H3" if all text runs are bold (your H3-as-bold pattern)
    has_text = False
    for r in p.runs:
        if r.text.strip():
            has_text = True
            if not (r.bold or (r.font and r.font.bold)):
                return False
    return has_text

def para_to_html(p):
    # Preserve line-level italics/bold minimally
    parts = []
    for r in p.runs:
        t = html.escape(r.text)
        if not t:
            continue
        if r.bold or (r.font and r.font.bold):
            t = f"<strong>{t}</strong>"
        if r.italic or (r.font and r.font.italic):
            t = f"<em>{t}</em>"
        parts.append(t)
    return "<p>" + "".join(parts) + "</p>"

def docx_copy_images(docx_path: Path, media_out: Path) -> dict:
    """
    Copy /word/media/* to media_out. Returns a map of rId->filename for inline mapping attempts.
    (We also expose a simple list; exact inline positions are hard; we attach to nearest LO below.)
    """
    media_out.mkdir(parents=True, exist_ok=True)
    rId_to_name = {}
    with zipfile.ZipFile(docx_path, 'r') as z:
        # Copy media
        for name in z.namelist():
            if name.startswith('word/media/'):
                fn = Path(name).name
                with z.open(name) as src, open(media_out / fn, 'wb') as dst:
                    shutil.copyfileobj(src, dst)
    # Best-effort map rId -> target image filename
    # Walk relationships in document part
    doc = Document(docx_path)
    part = doc.part
    for rel in part.rels.values():
        if rel.reltype == RELATIONSHIP_TYPE.IMAGE:
            target = Path(rel._target.partname).name  # e.g., image1.png
            rId_to_name[rel.rId] = target
    return rId_to_name

def collect_inline_images(doc):
    """
    Build a list of inline images per paragraph index.
    We rely on low-level relationship IDs stored in drawings.
    """
    para_idx_to_imgs = defaultdict(list)

    for bi, b in enumerate(doc.element.body.iter()):
        # Limit scan to w:p (paragraph) elements
        if b.tag.endswith('}p'):
            # find drawings in this paragraph
            drawings = list(b.iterfind('.//{http://schemas.openxmlformats.org/drawingml/2006/main}blip'))
            imgs = []
            for d in drawings:
                rId = d.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                if rId:
                    imgs.append(rId)
            if imgs:
                para_idx_to_imgs[bi].extend(imgs)
    return para_idx_to_imgs

# ---------- parser

def parse_docx(docx_path: Path, ch_num: int, media_root: Path):
    doc = Document(docx_path)
    # map para element index to inline rIds
    para_idx_to_imgs = collect_inline_images(doc)
    # copy images out
    ch_media_dir = media_root / f'ch{ch_num}'
    rId_to_name = docx_copy_images(docx_path, ch_media_dir)

    chapter_title = None
    los = []
    cur_lo = None
    cur_lo_html = []
    cur_lo_imgs = []

    # used for rag snippets (H3)
    snippets = []

    # Walk body paragraphs with a parallel body index (to attach inline images near content)
    body_paras = [p for p in doc.paragraphs]
    for i, p in enumerate(body_paras):
        if is_heading(p, 1):
            # Chapter title
            chapter_title = p.text.strip() or f"Chapter {ch_num}"
            continue

        if is_heading(p, 2):
            # New LO
            if cur_lo:
                # flush previous
                los.append({
                    "title": cur_lo,
                    "slug": slugify(cur_lo),
                    "html": "\n".join(cur_lo_html).strip(),
                    "images": cur_lo_imgs[:]
                })
            cur_lo = p.text.strip() or f"LO — {len(los)+1}"
            cur_lo_html, cur_lo_imgs = [], []
            continue

        # H3 snippet OR bold-only line => stash snippet and include as <h3>
        if is_heading(p, 3) or is_bold_line(p):
            h3_text = p.text.strip()
            if h3_text:
                cur_lo_html.append(f"<h3>{html.escape(h3_text)}</h3>")
                # capture snippet for rag
                snippets.append({
                    "chapter": chapter_title or f"Chapter {ch_num}",
                    "lo": cur_lo or "",
                    "title": h3_text,
                    "text": h3_text,  # short; we’ll also add nearby body
                    "url": f"#ch{ch_num}-{slugify(cur_lo or '')}"
                })
            continue

        # normal paragraph
        if p.text.strip():
            cur_lo_html.append(para_to_html(p))

        # attach any inline images found at this paragraph
        if i in para_idx_to_imgs:
            for rId in para_idx_to_imgs[i]:
                img_name = rId_to_name.get(rId)
                if img_name:
                    rel_path = f"/static/media/ch{ch_num}/{img_name}"
                    cur_lo_imgs.append(rel_path)
                    cur_lo_html.append(f'<figure><img src="{rel_path}" alt=""><figcaption></figcaption></figure>')

    # flush last LO
    if cur_lo:
        los.append({
            "title": cur_lo,
            "slug": slugify(cur_lo),
            "html": "\n".join(cur_lo_html).strip(),
            "images": cur_lo_imgs[:]
        })

    # chapter fallback
    if not chapter_title:
        chapter_title = f"Chapter {ch_num}"

    return {
        "chapter_title": chapter_title,
        "chapter_slug": f"ch{ch_num}",
        "los": los,
        "snippets": snippets
    }

# ---------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="Folder with .docx files")
    ap.add_argument("--out", default="site.json", help="Path to site.json to write")
    ap.add_argument("--rag", default="static/rag/chunks.json", help="Path to rag chunks json")
    ap.add_argument("--media", default="static/media", help="Root for extracted media")
    ap.add_argument("--book", default="Advice Only™ Methodology (2024)")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    src = Path(args.src)
    media_root = Path(args.media)
    tmp_html = Path("tmp_html"); tmp_html.mkdir(exist_ok=True)

    files = sorted(src.glob("*.docx"))
    if not files:
        print(f"[!] No .docx in {src}")
        return

    chapters = []
    all_snips = []
    for idx, f in enumerate(files, start=1):
        print(f"… parsing ch{idx}: {f.name}")
        data = parse_docx(f, idx, media_root)
        chapters.append({
            "title": data["chapter_title"],
            "slug": data["chapter_slug"],
            "los": [{"title": lo["title"], "slug": lo["slug"]} for lo in data["los"]]
        })

        # write per-chapter preview
        html_path = tmp_html / f"({datetime.now().year}) {data['chapter_title']}.html"
        with open(html_path, "w", encoding="utf-8") as w:
            w.write(f"<h1>{html.escape(data['chapter_title'])}</h1>")
            for lo in data["los"]:
                w.write(f"<h2 id='{data['chapter_slug']}-{lo['slug']}'>{html.escape(lo['title'])}</h2>")
                w.write(lo["html"])

        # stash detailed content into site_details to embed in site.json (UI will read it)
        data_for_json = {
            "title": data["chapter_title"],
            "slug": data["chapter_slug"],
            "los": data["los"]
        }
        # temporarily store the full detail; we will build final site.json below
        chapters[-1]["__detail"] = data_for_json

        # rag snippets: enrich short text with nearby LO body first paragraph (if exists)
        for sn in data["snippets"]:
            # Find LO body first paragraph (strip tags)
            lo = next((x for x in data["los"] if slugify(x["title"]) == sn["url"].split('#')[-1].split('-')[-1]), None)
            body_txt = ""
            if lo and lo["html"]:
                first_p = re.search(r"<p>(.*?)</p>", lo["html"], re.S)
                if first_p:
                    bt = re.sub(r"<.*?>", "", first_p.group(1))
                    body_txt = ": " + bt[:300]
            all_snips.append({
                "id": f"ch{idx}-{slugify(sn['title'])}",
                "title": f"{data['chapter_title']} • {sn['title']}",
                "text": (sn["text"] + body_txt).strip(),
                "url": sn["url"]
            })

    # Build final site.json (include full per-LO HTML)
    site = {
        "title": args.book,
        "generated": datetime.utcnow().isoformat() + "Z",
        "chapters": []
    }
    for ch in chapters:
        det = ch.pop("__detail")
        site["chapters"].append(det)

    with open(args.out, "w", encoding="utf-8") as w:
        json.dump(site, w, ensure_ascii=False, indent=2)
    Path(args.rag).parent.mkdir(parents=True, exist_ok=True)
    with open(args.rag, "w", encoding="utf-8") as w:
        json.dump(all_snips, w, ensure_ascii=False, indent=2)

    # Summary
    tot_los = sum(len(c["los"]) for c in site["chapters"])
    print(f"[ok] Wrote {args.out}: {len(site['chapters'])} chapters, {tot_los} LOs")
    print(f"[ok] Wrote {args.rag}: {len(all_snips)} snippets")
    print(f"[i] Previews in {tmp_html.absolute()}")
    print("[i] Images copied under", media_root)

if __name__ == "__main__":
    main()
