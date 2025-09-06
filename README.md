Got it 👍 — here’s a tightened-up **v2.0 roadmap (updated)**. I kept your structure, but smoothed the phrasing, clarified next steps, and grouped “quick wins” a bit cleaner so you can grab and go.

---

# content & authoring

* **Per-chapter canonical source**
  *Impact:* high • *Effort:* low
  **Do:** keep `scripts/build_per_chapter.sh` authoritative; add a unit test that asserts chapter/LO counts.
* **Author preview mode (hot-reload)**
  *Impact:* med • *Effort:* med
  **Do:** lightweight dev server (`npm run dev`) that watches `content/docx/**` → rebuilds → opens `tmp_html` with live reload.
* **Inline tokens++**
  *Impact:* med • *Effort:* low
  **Do:** extend tokenizer to support `[[img:n]]`, `[[vid:n]]`, `[[quiz:id]]`, `[[assessment]]` so writers can drop assets/quizzes inline.

# assessments & quizzes

* **Unified JSON schema + validator**
  *Impact:* high • *Effort:* med
  **Do:** `scripts/validate_assessments.mjs` that enforces SurveyJS shape, stamps `$schema:"ao/assessment@1"`.
* **Scoring + review mode**
  *Impact:* high • *Effort:* med
  **Do:** after completion, show correct answers/explanations and store % score in `LS_ASSESS`.
* **Question bank / randomization**
  *Impact:* med • *Effort:* med
  **Do:** support `pool:[…]` with `count:n` to sample questions per attempt.

# search & RAG

* **Server-side embedder**
  *Impact:* high • *Effort:* med
  **Do:** Node/Express worker that (1) embeds `full/rag.json` on push, (2) serves `/search?q=…` over vectors.
* **Inline “Ask this page”**
  *Impact:* med • *Effort:* low
  **Do:** LO view button → hits RAG endpoint seeded with that LO’s text.

# data, sync & privacy

* **Optional cloud sync**
  *Impact:* high • *Effort:* med
  **Do:** opt-in sign-in that syncs localStorage progress to a user key.
* **Auto import on first load**
  *Impact:* med • *Effort:* low
  **Do:** drag-and-drop `my-data.json` → restores automatically.

# UX & accessibility

* **Keyboard nav + skip links**
  *Impact:* med • *Effort:* low
  **Do:** arrow keys to move LO/chapters; add `skip-to-content`.
* **Dark/light theme polish**
  *Impact:* low • *Effort:* low
  **Do:** tune contrast; detect system preference.

# performance & delivery

* **Asset hashing + cache headers**
  *Impact:* med • *Effort:* low
  **Do:** hash `static/*` filenames; add `Cache-Control: immutable`.
* **Code-split SurveyJS**
  *Impact:* med • *Effort:* low
  **Do:** lazy-load survey libs only on quiz/assessment routes.

# reliability & QA

* **Smoke tests (Playwright)**
  *Impact:* high • *Effort:* med
  **Do:** tests: nav loads, LO view, quiz completes, assessment completes, “My Data” displays.
* **Schema tests in CI**
  *Impact:* high • *Effort:* low
  **Do:** GitHub Action: build → validate `site.json` + assessments → fail PR if broken.

# author comfort & tooling

* **CLI scaffolds**
  *Impact:* med • *Effort:* low
  **Do:** `ao new chapter`, `ao new quiz` to generate boilerplate.
* **Docx linter**
  *Impact:* med • *Effort:* med
  **Do:** check headings, LO numbering, consistency.

# events & community

* **Events iCal feed**
  *Impact:* med • *Effort:* low
  **Do:** generate `/events.ics` from `site.events`.
* **Session reminders**
  *Impact:* med • *Effort:* med
  **Do:** opt-in email or browser push reminders.

# integrations

* **LMS/LTI thin shim**
  *Impact:* med • *Effort:* med
  **Do:** expose completion webhook + deep links.
* **Email digest**
  *Impact:* low • *Effort:* low
  **Do:** optional weekly progress email.

# versioning & migrations

* **Schema everywhere + migrators**
  *Impact:* med • *Effort:* low
  **Do:** bump to `ao/site@2`; write `migrate_site_1_to_2.mjs`.

---

## Quick wins (≈1–2 hrs)

1. **CI checks**

   * GitHub Action:

     ```bash
     ./scripts/build_per_chapter.sh &&
     node scripts/normalize_assessments.mjs &&
     node scripts/merge_assessments.mjs
     ```
   * Validate: chapter count, LO count, assessment presence.
2. **Lazy-load SurveyJS**

   * In `index.html`, dynamic `import()` survey libs on quiz/assessment routes only.
3. **Author preview server**

   * `npm run dev` using `live-server` or `vite` to serve root + watch `content/**`.

---

👉 Let me know which two (CI checks, embedder server, smoke tests) you want me to hand you first and I’ll drop in the starter files + exact commands.

# content & authoring

* **Per-chapter source → canonical**
  *Impact:* high • *Effort:* low
  **Do:** keep `scripts/build_per_chapter.sh` as the single source of truth; guard it with a unit test that asserts chapter/LO counts.
* **Author preview mode** (hot-reload)
  *Impact:* med • *Effort:* med
  **Do:** tiny dev server that watches `content/docx/**` and auto-runs build → opens `tmp_html` with live reload.
* **Inline tokens++** (`[[img:n]]`, `[[vid:n]]`, `[[quiz:id]]`, `[[assessment]]`)
  *Impact:* med • *Effort:* low
  **Do:** extend tokenizer so writers can drop quizzes anywhere.

# assessments & quizzes

* **Unified JSON schema + validator**
  *Impact:* high • *Effort:* med
  **Do:** add `scripts/validate_assessments.mjs` that checks `pages[].elements[]` against SurveyJS shape and stamps `$schema:"ao/assessment@1"`.
* **Result scoring + review mode**
  *Impact:* high • *Effort:* med
  **Do:** when a user completes, show correct answers/explanations and store an overall % in `LS_ASSESS`.
* **Question bank + randomization**
  *Impact:* med • *Effort:* med
  **Do:** support `pool: [{...}]` with `count:n` to sample per attempt.

# search & RAG

* **Embed `full/rag.json`** (server side)
  *Impact:* high • *Effort:* med
  **Do:** a small Node/Express worker that (1) embeds on push, (2) serves `/search?q=…` over vectors.
* **Inline “ask this page”**
  *Impact:* med • *Effort:* low
  **Do:** button in LO view that hits RAG endpoint seeded with that LO’s text.

# data, sync & privacy

* **Optional cloud sync of progress**
  *Impact:* high • *Effort:* med
  **Do:** offer “sign in” → sync localStorage to user key; stays opt-in.
* **Export/import** (already have CSV/JSON) → **auto-import on first load**
  *Impact:* med • *Effort:* low
  **Do:** drag-and-drop `my-data.json` to restore.

# UX & accessibility

* **Keyboard nav + skip links**
  *Impact:* med • *Effort:* low
  **Do:** arrow keys to move LO/chapters, `aria-current` already set; add skip-to-content.
* **Dark/light theme polish**
  *Impact:* low • *Effort:* low
  **Do:** tune contrast, add system-pref detection.

# performance & delivery

* **Asset hashing + cache headers**
  *Impact:* med • *Effort:* low
  **Do:** rename `static/*` with content hashes; set `Cache-Control: immutable`.
* **Code split vendor (SurveyJS)**
  *Impact:* med • *Effort:* low
  **Do:** lazy-load survey libs only on quiz/assessment routes.

# reliability & QA

* **Smoke tests (Playwright)**
  *Impact:* high • *Effort:* med
  **Do:** tests for: nav loads, LO view, quiz completes, assessment completes, “My Data” shows results.
* **Schema tests in CI**
  *Impact:* high • *Effort:* low
  **Do:** GitHub Action: run build → validate site.json/assessments → fail PR if broken.

# author comfort & tooling

* **CLI scaffolds** (`ao new chapter`, `ao new quiz`)
  *Impact:* med • *Effort:* low
  **Do:** generate boilerplate JSON and docx placeholders.
* **Docx linter** (headings, numbered LOs)
  *Impact:* med • *Effort:* med

# events & community

* **Events iCal feed**
  *Impact:* med • *Effort:* low
  **Do:** export `/events.ics` from `site.events`.
* **Session reminders** (optional)
  *Impact:* med • *Effort:* med

# integrations

* **LMS/LTI thin shim**
  *Impact:* med • *Effort:* med
  **Do:** expose completion webhook & deep links to chapters/assessments.
* **Email progress digest** (opt-in)
  *Impact:* low • *Effort:* low

# versioning & migrations

* **`$schema` everywhere + migrators**
  *Impact:* med • *Effort:* low
  **Do:** bump to `ao/site@2`, write `migrate_site_1_to_2.mjs`.

---

## quick wins you can do today (≈1–2 hrs)

1. **Add CI checks**

   * GitHub Action: `./scripts/build_per_chapter.sh && node scripts/normalize_assessments.mjs && node scripts/merge_assessments.mjs`.
   * Validate: chapter count, LO count, assessment presence for all 9.
2. **Lazy-load SurveyJS**

   * In `index.html`, wrap SurveyJS imports with dynamic `import()` when route is `assessment` or snippet has a quiz.
3. **Author preview server**

   * Simple `npm run dev` using `live-server` or `vite` to serve root and watch `content/**`.

If you want, I can spin up:

* The **GitHub Action yaml** for CI checks, and
* A **tiny embedder server** (Node + pgvector) starter,
* The **Playwright smoke tests** scaffold.

Tell me which two you want first and I’ll hand you the files + exact commands.
