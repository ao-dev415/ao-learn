# AO Learning — Build & Deploy (A→Z)

This bundle gives you one reproducible build that emits everything your viewer needs.

## Inputs
- `content/site.v2.json` (authoring source) — if missing, falls back to `site.json`
- `data/registry.json`
- `data/quizzes/*.json`
- `data/assessments/*.json`
- `index.html` and `scripts/ao-patch.js` (viewer runtime; unchanged)

## Outputs
- `dist/full/site.json` (full payload)
- `dist/site.json` (public; currently same as full)
- `site.json` (copy of `dist/site.json` at repo root for Cloudflare Pages)
- `dist/seo.json` (JSON‑LD per route for SPA SEO)
- `dist/rag/index.json` (flat text chunks for RAG/local search)
- `dist/data/**` (copied instruments for viewer fetches)

## Commands

```bash
npm install
npm run build
npm run preview   # http://localhost:5173
```

## Optional SEO injection

To inject JSON‑LD on route changes, include this tag near the end of `index.html` (before `</body>`):

```html
<script src="scripts/seo-inject.js"></script>
```

The script loads `dist/seo.json` and inserts a `<script type="application/ld+json" id="ao-jsonld">` tag for the current route.

## CI / Cloudflare Pages

Point Pages to the repository root and keep `site.json` in root (the build copies it). Ensure the `data/` folder is committed or produced by your pipeline.
