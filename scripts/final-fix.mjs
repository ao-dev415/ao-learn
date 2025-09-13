import fs from 'fs';
const file = 'index.html';
let s = fs.readFileSync(file, 'utf8');

// Ensure a DOMContentLoaded block ends with `});` before its </script>
function ensureDclCloseAround(indexHint) {
  if (indexHint < 0) return;
  const start = s.lastIndexOf('<script', indexHint);
  if (start < 0) return;
  const end = s.indexOf('</script>', indexHint);
  if (end < 0) return;
  const block = s.slice(start, end);
  const hasDCL = /DOMContentLoaded/.test(block);
  const endsOK = /\}\);\s*$/.test(block);
  if (hasDCL && !endsOK) s = s.slice(0, end) + '\n});' + s.slice(end);
}

// 1) Fix the consent script & the app script immediately before it
const MARK = 'AO Privacy Popup & Consent';
const mi = s.indexOf(MARK);
if (mi !== -1) {
  // consent block: force `});` before its </script> if missing
  const end = s.indexOf('</script>', mi);
  if (end !== -1) {
    const tail = s.slice(Math.max(0, end - 300), end);
    if (!/\}\);\s*$/.test(tail)) s = s.slice(0, end) + '\n});' + s.slice(end);
  }
  // app block just before consent: ensure it closes too
  ensureDclCloseAround(mi - 1);
}

// 2) Tidy leftovers
// collapse accidental double </script>
s = s.replace(/\}\);\s*<\/script>\s*<\/script>/g, '});\n</script>');
// remove stray `});` sitting immediately before </script>
s = s.replace(/\n\s*\}\);\s*\n\s*<\/script>/g, '\n</script>');

fs.writeFileSync(file, s);
console.log('[final-fix] normalized DOMContentLoaded closers; cleaned script tags');
