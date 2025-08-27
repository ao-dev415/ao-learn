# Advice-Only® Bookstore (Preview)

A single-file, static reader for chaptered learning content with:
- left-side **chapter/LO navigation**
- **RAG-style search** over titles, previews, and snippet bodies
- right rail **Alerts / Next event / Progress**
- local-only **time-on-page** tracking with red/yellow/green competency
- menu pages: **Home · My Data · Events · Privacy · About**

No build tools required; serves as plain HTML + JSON.

---

## Quick start

1. Place `index.html` at your site root.
2. Add a `site.json` next to it (see schema below).
3. (Optional) Add `/logo.svg` for the brand mark. The brand text reads **Advice-Only®**.

Open `index.html` in a browser or serve from any static host.
Append `?full=1` to the URL to load `/full/site.json` instead of `/site.json`.

---

## Routes

- `#home` — welcome and at-a-glance stats
- `#data` — _My Data_ page with time-on-page and competency status
- `#events` — list of events from `site.json`
- `#privacy` — app privacy notes (local-only analytics)
- `#about` — about/profile info (from `site.json`)

Learning objectives use hash routes like `#ch1-lo2`.

---

## Time / competency model

- Timing starts when an LO loads and stops on navigation or route change.
- Data is stored in `localStorage`:
  - `ao.v2.seen` — array of `"chapterIdx.loIdx"` keys
  - `ao.v2.time` — map `{ "chapter.lo": seconds }`
- Competency colors (adjust inside `index.html`):
  - **Red** `< 20s`, **Yellow** `20–59s`, **Green** `≥ 60s`
- _My Data_ provides:
  - overall progress
  - distribution by color
  - per-chapter totals and per-LO seconds + dot
  - **Clear progress** / **Clear time** buttons

> Nothing is sent to a server. All analytics are local to the browser.

---

## Search (RAG-style lite)

- Tokenizes the query and ranks documents by token overlap across weighted fields:
  - LO title (×3), preview (×2), snippet title (×2), snippet body (×1)
- Type to get a top-8 dropdown; **Enter** opens a results page.

---

## `site.json` schema (minimal)

```json
{
  "title": "Advice-Only® Methodology",
  "alerts": ["Welcome to the preview."],
  "about": {
    "name": "Your Name, CFP®",
    "location": "City, ST",
    "bio": "Short professional bio here.",
    "specialties": ["Retirement income", "Tax efficiency"],
    "ctaLabel": "Work with me",
    "ctaUrl": "https://example.com/contact"
  },
  "events": [
    {
      "title": "Advisor CE — Online",
      "date": "2025-10-01",
      "time": "16:00",
      "tz": "America/Los_Angeles",
      "mode": "Online",
      "ctaLabel": "Register",
      "ctaUrl": "https://example.com/register"
    }
  ],
  "chapters": [
    {
      "title": "My Perfect Plan",
      "index": 1,
      "los": [
        {
          "title": "1.1 — What's The Perfect Plan?",
          "preview": "…",
          "snippets": [
            {"title":"Body","body":"…"}
          ]
        }
      ]
    }
  ]
}
