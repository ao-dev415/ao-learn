# Advice-Only® Bookstore (Preview)



How to add & place images (recommended workflow)
1) Where to put files

Create a structured images folder inside your project, e.g.:

/images/
  ch01/lo02/
    ch01-lo02-fig01.webp
    ch01-lo02-fig02.webp


Prefer .webp (or high-quality .jpg) at ~1600px wide for most illustrations.

Videos: put .mp4 (H.264) and/or .webm in a similar path:

/images/ch01/lo02/ch01-lo02-demo.mp4

2) Naming convention (simple & sortable)

ch{CC}-lo{LL}-fig{NN}.{ext}

Example: ch01-lo02-fig01.webp

Keep chapter/LO folders: ch01/lo02/… to avoid clutter.

3) Reference images in site.json

Put images on the snippet (so you can position them mid-body with tokens).

Use an images array of objects with src, alt, caption (optional but recommended).

Example: Chapter 1, LO 1.2, one image mid-way in the body

{
  "title": "1.2 — Why Be Rational?",
  "preview": "Objectivity reduces uncertainty.",
  "snippets": [
    {
      "title": "Body",
      "body": "Intro paragraph... [[img:1]] then more text after the image.",
      "images": [
        {
          "src": "/images/ch01/lo02/ch01-lo02-fig01.webp",
          "alt": "Simple chart contrasting method vs product focus",
          "caption": "Method > product: reduce decision noise."
        }
      ]
    }
  ]
}


[[img:1]] means “insert the 1st image from this snippet’s images array here.”

If you have more, add [[img:2]], [[img:3]], etc.

If you omit tokens, all snippet images will render after the text block automatically.

LO-level images (top-level lo.images) are also supported and render after the snippet content.

4) Testing quickly

Run a simple local server from your project root:

Node: npx serve .

Python: python3 -m http.server 8080

Visit http://localhost:PORT/ and use the left nav to open your LO.

Click images to open the lightbox (zoom view).

5) If you’re starting from a DOCX

This single-page app reads site.json, not .docx files directly.

Best practice for V1: export/collect your media into /images/... and reference them from site.json as shown above.

If you later automate DOCX→JSON, you can still follow the same image path/naming patterns so it drops in cleanly.

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
