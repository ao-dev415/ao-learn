import fs from 'node:fs';

const file = 'index.html';
let s = fs.readFileSync(file, 'utf8');

// Find an anchor related to the consent/analytics banner
let idx = s.search(/ao-?v2-?privacyBanner|analytics-(save|allow)|Privacy Popup|consent/i);
if (idx < 0) {
  console.error('[fix-consent] could not find any consent anchor (privacyBanner/analytics).');
  process.exit(1);
}

// Find the <script …> that contains that anchor, then its closing </script>
const startTag = s.lastIndexOf('<script', idx);
const startClose = s.indexOf('>', startTag);
const endTag = s.indexOf('</script>', idx);
if (startTag < 0 || startClose < 0 || endTag < 0) {
  console.error('[fix-consent] could not bracket the consent script tag.');
  process.exit(1);
}

const before = s.slice(0, startTag);
const after  = s.slice(endTag + '</script>'.length);

// Clean, syntax-safe consent script
const replacement = `// ===== AO Privacy Popup & Consent (clean)
document.addEventListener('DOMContentLoaded', () => {
  const LS = window.localStorage;
  const KEY = 'ao:consent';
  const banner   = document.getElementById('ao-v2-privacyBanner');
  const allowBtn = document.getElementById('ao-analytics-allow');
  const saveBtn  = document.getElementById('ao-analytics-save');
  const gaBox    = document.getElementById('opt-ga');
  const mcBox    = document.getElementById('opt-clarity');
  const hasGPC   = () => (navigator?.globalPrivacyControl === true);

  const get = () => { try { return JSON.parse(LS.getItem(KEY) || '{}'); } catch { return {}; } };
  const set = (v) => { try { LS.setItem(KEY, JSON.stringify(v)); } catch {} };

  const apply = (c) => {
    // Plug GA/Clarity loaders here if needed; safe no-op otherwise.
    if (!hasGPC() && c.ga) { window.dataLayer = window.dataLayer || []; }
  };

  const state = get();
  if (!hasGPC() && (state.ga || state.clarity)) apply(state);

  if (banner) {
    const save = () => {
      const next = { ga: !!gaBox?.checked, clarity: !!mcBox?.checked };
      set(next); apply(next);
      banner.style.display = 'none';
    };
    allowBtn?.addEventListener('click', () => {
      if (gaBox) gaBox.checked = true;
      if (mcBox) mcBox.checked = true;
      save();
    });
    saveBtn?.addEventListener('click', save);
  }
});`;

const fixed = before + '<script>\n' + replacement + '\n</script>' + after;
fs.writeFileSync(file, fixed);
console.log('[fix-consent] replaced consent script based on anchor detection');
