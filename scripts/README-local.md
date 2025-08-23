# AO Local Preview (Docx → Local static site)
This folder lets you build and view a **fully local** preview of your book without Hugo or GitHub.

## What it does
- Converts your `.docx` chapters (H1/H2/H3) into a single `site.json` nav + HTML.
- Extracts images to `static/media/` and rewrites links in the HTML.
- Builds a lightweight **RAG index** (`static/rag/chunks.json`) from H3 sections for the Ask bar.
- Renders everything in `index.html` with a left tree, top Ask bar (book vs web), right Alerts rail, dark mode, A/A+ font-size, and local-only “My Data” badges.

## You need (one-time)
- **Pandoc** (for docx → html):  
  macOS: `brew install pandoc`  
  Windows: download from https://pandoc.org/installing.html
- **Python 3.9+**

## Put your chapters
Create a folder, e.g. `./source/2024`, and drop your DOCX files like:
```
(2024) Chapter 1 - My Perfect Plan.docx
(2024) Chapter 2 - Expenses.docx
...
(2024) Chapter 9 - Estate Planning.docx
```
Headings inside must be:
- **H1** = Chapter title (once per file)
- **H2** = Learning objective title (LO 1.1, LO 1.2, …)
- **H3** = Snippet lines (the bolded leads you described)

## Build
From this folder run:
```
python3 scripts/import_docx.py source/2024
```
This will produce:
```
site.json
static/media/… (images)
static/rag/chunks.json
```

## View locally
Just double-click `index.html`. (Or right-click → Open With → your browser)

Tip: if the browser blocks local fetches, you can serve it:
```
# Python
python3 -m http.server 8080
# then open http://localhost:8080/
```

## Notes
- The importer keeps **chapter order** by the numeric chapter in the filename.
- Images are converted to `<img>` and copied to `static/media/chX/`. Keep originals in Docx, we extract them.
- The RAG index uses H3 sections and their following paragraphs as the snippet text.
- Everything is local. Nothing uploads anywhere.
