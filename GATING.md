# Dual build (public + full) — keep your gating & SEO

This build emits **both** variants:
- `dist/full/site.json` (private/full)
- `dist/public/site.json` (public/redacted)

It also copies:
- `full/site.json`  (for the viewer when `?full=1`)
- `site.json`       (public; what Cloudflare Pages serves by default)

Your viewer already supports `?full=1`. No changes needed.

## Configure what stays public

Create `content/public.config.json` (optional). Defaults shown:

```json
{
  "includeQuizzes": true,
  "includeAssessments": false,
  "keepGatedSnippets": true,
  "stripBodiesOver": 2000
}
```

- `includeQuizzes`: keep quiz snippets in public
- `includeAssessments`: if true, keep chapter assessments in public; default is **false**
- `keepGatedSnippets`: keep placeholder/gated snippets; set false to drop them
- `stripBodiesOver`: truncate long snippet bodies in public (characters)

## SEO overrides (keep your hand-tuned JSON)

Put route-keyed overrides in `content/seo_overrides.json`:

```json
{
  "#ch1-lo1": {
    "headline": "Expenses — Basics",
    "description": "Short, tuned description for search results.",
    "keywords": "budget, expenses, basics"
  },
  "#ch1-assessment": {
    "headline": "Expenses — Assessment"
  }
}
```

The generator merges these over the auto output.

## Authoring via chapters/

You can continue to directly edit `content/site.v2.json` or author in `chapters/` with front‑matter. The `prebuild` step will ingest `chapters/` into `content/site.v2.json` automatically if present.
