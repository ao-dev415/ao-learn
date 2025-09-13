# Chapters → site.v2.json → site.json (authoring flow)

Author content under `chapters/` and let the build produce `content/site.v2.json` automatically.

See `GATING.md` for how the public/full dual build works.

Folder shape:

```
chapters/
  01-expenses/
    chapter.json
    01-basics.html
    02-categories.html
data/
  quizzes/*.json
  assessments/*.json
  registry.json
```

LO file front-matter keys:
- `title`, `preview`, `quiz`, `visibility`

Run:

```bash
npm install
npm run build
npm run preview
```
