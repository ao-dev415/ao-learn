# Per-Chapter Source Layout (Drop-in)

This keeps your HTML untouched. It only reorganizes the DOCX sources and uses your existing feeder to regenerate:
- ./site.json (same path)
- ./full/rag.json

## Put DOCX here (filenames must be chNN.docx)
content/docx/
  ch01_my-perfect-plan/ch01.docx
  ch02_expenses/ch02.docx
  ch03_cashflow-net-worth/ch03.docx
  ch04_types-of-accounts/ch04.docx
  ch05_guarantees/ch05.docx
  ch06_distributions/ch06.docx
  ch07_investments/ch07.docx
  ch08_insurance/ch08.docx
  ch09_estate-planning/ch09.docx

## Build (no HTML changes)
./scripts/build_per_chapter.sh
