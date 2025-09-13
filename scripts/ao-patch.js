// AO patch: full->public fallback + v2 pre-adapt (assessments & quiz refs) + adapter hook
(function () {
  'use strict';

  // 1) full/site.json -> site.json fallback (so ?full=1 never blanks page)
  try {
    const params = new URLSearchParams(location.search);
    const wantsFull = params.has('full');
    const origFetch = window.fetch;
    window.fetch = async function (input, init) {
      const url = (typeof input === 'string') ? input : (input && input.url);
      if (typeof url === 'string' && /\/full\/site\.json$/.test(url)) {
        const r = await origFetch(input, init);
        if (!r.ok) {
          console.warn('[AO] full/site.json missing; falling back to site.json');
          if (wantsFull) {
            params.delete('full');
            history.replaceState(null, '', location.pathname + (params.size ? ('?' + params.toString()) : ''));
          }
          return origFetch('site.json', init);
        }
        return r;
      }
      return origFetch(input, init);
    };
  } catch (e) {
    console.warn('[AO] fetch fallback install failed:', e);
  }

  // 2) Non-blocking registry load (for quiz/assessment refs)
  (async () => {
    try {
      const r = await fetch('data/registry.json');
      if (r.ok) window.REGISTRY = await r.json();
    } catch (_) {}
  })();

  // 3) Pre-adapt v2: promote assessments & normalize quiz refs to {quiz:{src}}
  function preAdapt(v2) {
    const REG = window.REGISTRY || {};
    (v2.chapters || []).forEach(ch => {
      // Promote section-level assessment to chapter.assessment
      if (!ch.assessment) {
        const sec = (ch.sections || []).find(s =>
          (s.sub_objectives || []).some(so => so && so.type === 'assessment' && (so.src || so.ref))
        );
        if (sec) {
          const so = (sec.sub_objectives || []).find(so => so && so.type === 'assessment');
          const refSrc = so?.ref ? (REG.assessments?.[so.ref]?.src || `data/assessments/${so.ref}.json`) : null;
          const src = so?.src || refSrc || null;
          if (src) ch.assessment = { title: ch.assessment?.title || (so.title || 'Chapter Assessment'), src };
        }
      }
      // Normalize quizzes
      (ch.sections || []).forEach(sec => {
        (sec.sub_objectives || []).forEach(so => {
          if (so && so.type === 'quiz' && !so.quiz) {
            const refSrc = so.ref ? (REG.quizzes?.[so.ref]?.src || `data/quizzes/${so.ref}.json`) : null;
            const src = so.src || refSrc || null;
            if (src) so.quiz = { src };
          }
        });
      });
    });
    return v2;
  }

  // 4) Monkey-patch the adapter if present (or expose preAdapt for later)
  const original = window.__ao_adaptV2ToLegacy;
  if (typeof original === 'function') {
    const patched = function (v2) {
      try { v2 = preAdapt(v2); } catch (e) { console.warn('[AO] preAdapt failed:', e); }
      return original(v2);
    };
    patched.__aoPatched = true;
    window.__ao_adaptV2ToLegacy = patched;
  } else {
    window.__ao_patch_preAdapt = preAdapt;
  }
})();
