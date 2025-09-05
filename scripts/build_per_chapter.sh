#!/usr/bin/env bash
set -euo pipefail

# Find any per-chapter docx (content/docx/**/chNN.docx)
CHPTS="$(find content/docx -maxdepth 2 -type f -name 'ch*.docx' 2>/dev/null || true)"

# If none found, fallback to legacy single file under source/book.docx
if [ -z "$CHPTS" ]; then
  echo "[i] No per-chapter DOCX found; falling back to legacy source/book.docx"
  if [ ! -f source/book.docx ]; then
    echo "[!] source/book.docx not found. Add per-chapter files under content/docx/**/chNN.docx or restore source/book.docx" >&2
    exit 1
  fi
  python3 scripts/import_docx.py \
    --src source \
    --out site.json \
    --rag full/rag.json \
    --max-paras 6 \
    --verbose
  echo "[ok] Wrote site.json and full/rag.json (legacy single-file build)"
  exit 0
fi

# Otherwise, build from per-chapter sources (same outputs your HTML expects)
echo "[i] Building from per-chapter DOCX under content/docx/**/chNN.docx"
python3 -m pip install -q python-docx || true

python3 scripts/import_docx.py \
  --src content/docx \
  --out site.json \
  --rag full/rag.json \
  --max-paras 6 \
  --verbose

echo "[ok] Wrote ./site.json and ./full/rag.json (paths unchanged)"
