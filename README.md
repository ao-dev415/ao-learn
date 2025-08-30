# Advice-Only® Bookstore (Preview)

No, that's not the correct order. You must run **both scripts locally first**, and then do **one final push** at the end.

To prevent the overwriting problem, you have to save your progress with Git **in between** running the two scripts.

-----

### \#\# The Correct Turnkey Process

Here is the exact, step-by-step workflow you should follow every time.

#### 1\. Run the Main Build Script

This creates the `site.json` file with all your text, quizzes, and assessments.

```bash
node scripts/docx-to-json.mjs
```

-----

#### 2\. Save Your Progress (Commit \#1)

This is the most important step. It saves the version of `site.json` with all your important data before the next script can touch it.

```bash
git add site.json
git commit -m "Build: Generate site.json with content and quizzes"
```

-----

#### 3\. Run the Media Script

This script now safely modifies the saved `site.json` to add the image paths.

```bash
node scripts/scan-media.mjs
```

-----

#### 4\. Save the Media Updates (Commit \#2)

This saves the final version of `site.json` with the media updates included.

```bash
git add site.json
git commit -m "Build: Update media paths in site.json"
```



This is a great next step for making your project more interactive and valuable. You're right to think about organization now, as it will save you a lot of time later.
The suggestion from your other resource is about implementing a light/dark theme, which is a great feature, but we can set it aside for now to focus on the assessments.
To handle complex, scored assessments for all 9 chapters in a clean, turnkey way, I recommend a three-part approach: organizing your data into separate files, creating a more powerful JSON structure for the assessments, and updating your HTML to render these new interactive forms.

## 1. The Best Way to Organize Your Files
Your current quizzes.json file will become very large and difficult to manage with 9 complex assessments and dozens of quizzes. The best practice is to break them into separate files.
Recommendation: Create a new top-level folder named data/. Inside it, create two subfolders: assessments/ and quizzes/.
Your new structure would look like this:


AO-V1/
├── data/
│   ├── assessments/
│   │   ├── ch1.json  <-- Assessment for Chapter 1
│   │   ├── ch2.json  <-- Assessment for Chapter 2
│   │   └── ...
│   └── quizzes/
│       ├── 1.1.json  <-- Quiz for LO 1.1
│       ├── 1.2.json  <-- Quiz for LO 1.2
│       └── ...
├── source/
│   └── book.docx
├── scripts/
│   └── docx-to-json.mjs
└── ...


This keeps each assessment and quiz completely separate and easy to edit. Your main build script (docx-to-json.mjs) would then be updated to read all files from these directories and merge them into the final site.json.

## 2. The New JSON Structure for Assessments
Your Risk Tolerance Questionnaire needs a more advanced JSON structure to handle point-based scoring and result profiles. Each assessment file (e.g., data/assessments/ch1.json) would look like this:
JSON


{
  "id": "assess-ch1",
  "chapter": "Chapter 1",
  "data": {
    "id": "risk_tolerance_ch1",
    "title": "Risk Tolerance Questionnaire",
    "questions": [
      {
        "text": "If the value of your $100,000 investment dropped to $70,000 overnight, how would you react?",
        "options": [
          { "text": "Panic and sell all of your investments.", "points": 0 },
          { "text": "Be concerned but wait for it to recover.", "points": 1 },
          { "text": "View it as a buying opportunity and invest more.", "points": 2 }
        ]
      },
      {
        "text": "Which investment would you be most comfortable with?",
        "options": [
          { "text": "A single stock with high risk/return.", "points": 2 },
          { "text": "A diversified portfolio of stocks and bonds.", "points": 1 },
          { "text": "A savings account with low risk/return.", "points": 0 }
        ]
      }
    ],
    "scoring": [
      { "minScore": 0, "maxScore": 1, "profile": "Conservative", "interpretation": "You prioritize the safety and stability of your investments over potential high returns." },
      { "minScore": 2, "maxScore": 3, "profile": "Balanced", "interpretation": "You seek a balance between risk and return, using a mix of stocks and bonds." },
      { "minScore": 4, "maxScore": 4, "profile": "Aggressive", "interpretation": "You are comfortable with higher levels of risk in pursuit of potentially higher returns." }
    ]
  }
}



## 3. The New renderAssessment Function
Finally, your index.html file needs a new, more powerful renderAssessment function that can build the questionnaire, calculate the score, and show the correct profile.
You would replace your entire existing renderAssessment function with this new version:
JavaScript


function renderAssessment(ch, chIdx) {
  const a = ch.assessment;
  if (!a || !Array.isArray(a.questions) || !a.questions.length) return;

  const host = h('div', { class: 'cardlet' });
  host.appendChild(h('h4', {}, a.title || 'Assessment'));
  if (a.intro) host.appendChild(h('p', { class: 'muted', style: 'margin-top:4px' }, a.intro));

  const prior = assessResults[a.id];
  const form = h('form', { style: 'margin-top:6px' });

  // Build Questions
  a.questions.forEach((q, qi) => {
    const fs = h('fieldset', { style: 'border:0;border-top:1px dashed var(--border);padding:10px 0;margin:8px 0 0' });
    fs.appendChild(h('div', { style: 'font-weight:600;margin-bottom:6px' }, `${qi + 1}. ${q.text}`));
    (q.options || []).forEach((opt, oi) => {
      const id = `${a.id}-q${qi}-o${oi}`;
      const lbl = h('label', { for: id, style: 'display:flex;gap:8px;align-items:center;margin:4px 0;cursor:pointer' });
      const rb = h('input', { type: 'radio', name: `q${qi}`, id: id.replace(/[^a-zA-Z0-9_-]/g, '_'), value: String(opt.points) });
      lbl.appendChild(rb);
      lbl.appendChild(h('span', {}, opt.text));
      fs.appendChild(lbl);
    });
    form.appendChild(fs);
  });

  const buttonRow = h('div', { style: 'margin-top:10px;display:flex;gap:8px;flex-wrap:wrap' });
  const submit = h('button', { type: 'submit', class: 'btn' }, prior ? 'Retake Assessment' : 'Submit Assessment');
  buttonRow.appendChild(submit);
  form.appendChild(buttonRow);

  const resultDisplay = h('div', { class: 'cardlet', style: 'display:none; margin-top:12px;' });
  host.append(form, resultDisplay);
  MAIN.appendChild(host);

  const showResult = (score) => {
    const profile = a.scoring.find(p => score >= p.minScore && score <= p.maxScore);
    resultDisplay.innerHTML = ''; // Clear previous results
    if (profile) {
      resultDisplay.appendChild(h('h4', {}, `Result: ${profile.profile} (Score: ${score})`));
      resultDisplay.appendChild(h('p', {}, profile.interpretation));
    } else {
      resultDisplay.appendChild(h('h4', {}, `Result (Score: ${score})`));
    }
    resultDisplay.style.display = 'block';
    form.querySelectorAll('input, button').forEach(el => el.disabled = true);
    submit.textContent = 'Retake Assessment';
  };

  if (prior) {
    showResult(prior.score);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submit.textContent === 'Retake Assessment') {
      form.querySelectorAll('input').forEach(i => { i.checked = false; i.disabled = false; });
      submit.disabled = false;
      submit.textContent = 'Submit Assessment';
      resultDisplay.style.display = 'none';
      return;
    }
    
    let totalScore = 0;
    const answers = a.questions.map((_, qi) => {
      const sel = form.querySelector(`input[name="q${qi}"]:checked`);
      if (sel) {
        totalScore += parseInt(sel.value, 10);
        return sel.value;
      }
      return -1;
    });

    const res = { chapter: chIdx + 1, score: totalScore, answers, ts: Date.now() };
    saveAssessResult(a.id, res);
    showResult(totalScore);
  });
}



-----

#### 5\. Push Everything to the Live Site

This uploads both of your new commits to the server at once.

```bash
git push origin main
```

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
