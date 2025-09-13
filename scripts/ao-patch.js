/* AO patch: chapter assessment + quiz/assessment-by-ref */
(function () {
  'use strict';

  const TOKEN_RE = /\[\[\s*assessment:([\w-]+)\s*\]\]/ig;

  function resolveFromRegistry(kind, id, fallback) {
    try {
      const REG = window.REGISTRY || null;
      if (!REG || !id) return fallback;
      const table = kind === 'assessment' ? REG.assessments : REG.quizzes;
      const src = table && table[id] && table[id].src;
      return src || fallback;
    } catch {
      return fallback;
    }
  }

  function pickAssessmentFromSection(sec) {
    // A) explicit sub_objective { type: 'assessment', ref/src/... }
    const so = (sec.sub_objectives || []).find(
      x => x && x.type === 'assessment' && (x.ref || x.assessment?.id || x.src || x.assessment?.src)
    );
    if (so) {
      const id  = so.ref || so.assessment?.id || null;
      const src = so.assessment?.src || so.src || (id ? `data/assessments/${id}.json` : null);
      return { id, src, title: so.title || sec.title || 'Chapter Assessment' };
    }

    // B) token in HTML [[assessment:ID]]
    const html = `${sec.section_public_html || ''} ${sec.preview_public_html || ''}`;
    TOKEN_RE.lastIndex = 0;
    const m = TOKEN_RE.exec(html);
    if (m) {
      const id = m[1];
      // Also strip token from the HTML so it doesn't show in body
      if (sec.section_public_html) sec.section_public_html = sec.section_public_html.replace(TOKEN_RE, '').trim();
      if (sec.preview_public_html) sec.preview_public_html = sec.preview_public_html.replace(TOKEN_RE, '').trim();
      return { id, src: `data/assessments/${id}.json`, title: sec.title || 'Chapter Assessment' };
    }

    return null;
  }

  function preAdapt(v2) {
    (v2.chapters || []).forEach(ch => {
      // 1) Promote to chapter.assessment if we can infer one
      if (!ch.assessment) {
        let found = null;
        for (const sec of (ch.sections || [])) {
          const f = pickAssessmentFromSection(sec);
          if (f) { found = f; break; }
        }
        if (found) {
          const resolved = resolveFromRegistry('assessment', found.id, found.src);
          ch.assessment = {
            id: found.id || 'assessment',
            title: found.title || 'Chapter Assessment',
            src: resolved
          };
        }
      }

      // 2) Normalize quizzes so they load by ref/src even if payload isn’t inline
      (ch.sections || []).forEach(sec => {
        (sec.sub_objectives || []).forEach(so => {
          if (so && so.type === 'quiz') {
            const id  = so.ref || so.id || so.quiz?.id || null;
            const viaReg = id ? resolveFromRegistry('quiz', id, null) : null;
            if (!so.quiz) so.quiz = {};
            so.quiz.src = so.quiz.src || so.src || viaReg || (id ? `data/quizzes/${id}.json` : null);
          }
        });
      });
    });
    return v2;
  }

  // Expose for the main adapter: __ao_adaptV2ToLegacy will call this if present
  window.__ao_patch_preAdapt = preAdapt;
})();
