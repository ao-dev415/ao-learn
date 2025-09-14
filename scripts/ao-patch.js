// scripts/ao-patch.js
(function () {
  'use strict';

  function regSrc(kind, id) {
    try {
      const reg = window.REGISTRY || {};
      const tbl = reg[kind + 's'] || reg[kind];
      return tbl?.[id]?.src || null;
    } catch {
      return null;
    }
  }
  const fallbackSrc = (kind, id) => `data/${kind}s/${id}.json`;

  function stripAssessmentTokens(s) {
    if (!s) return { text: s, ids: [] };
    const ids = [];
    const text = s.replace(/\[\[(assessment):([a-z0-9_-]+)\]\]/gi, (_m, _k, id) => {
      ids.push(id);
      return '';
    });
    return { text, ids };
  }

  function fromSubObjective(ch, sec) {
    const list = (sec?.sub_objectives) || [];
    const so = list.find(x => x && (x.type === 'assessment' || x.kind === 'assessment'));
    if (!so) return null;

    const id = so.ref || so.id || so.assessment?.id || null;
    const src = so.src || so.assessment?.src || (id && (regSrc('assessment', id) || fallbackSrc('assessment', id))) || null;
    const title = sec?.title || 'Chapter Assessment';
    if (!src) return null;
    return { id, src, title };
  }

  function fromTokens(ch, sec) {
    const fields = ['section_public_html', 'section_body', 'body', 'preview_public_html', 'preview'];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(sec, f) && typeof sec[f] === 'string') {
        const { text, ids } = stripAssessmentTokens(sec[f]);
        if (ids.length) {
          sec[f] = text; // mutate to remove token from content
          const id = ids[0];
          const src = regSrc('assessment', id) || fallbackSrc('assessment', id);
          const title = sec?.title || 'Chapter Assessment';
          return { id, src, title };
        }
      }
    }
    return null;
  }

  function normalizeQuizzes(ch) {
    (ch.sections || []).forEach(sec => {
      (sec.sub_objectives || []).forEach(so => {
        if (so && so.type === 'quiz') {
          if (!so.quiz) so.quiz = {};
          if (!so.quiz.src) {
            const qid = so.ref || so.id || null;
            so.quiz.src = so.src || (qid && (regSrc('quiz', qid) || fallbackSrc('quiz', qid))) || so.quiz.src;
          }
        }
      });
    });
  }

  function patch(v2) {
    (v2.chapters || []).forEach(ch => {
      // Find/construct chapter assessment once
      if (!ch.assessment || !ch.assessment.src) {
        let found = null;
        (ch.sections || []).some(sec => {
          found = fromSubObjective(ch, sec) || fromTokens(ch, sec);
          return !!found;
        });
        if (found) ch.assessment = { id: found.id, title: found.title, src: found.src };
      }
      normalizeQuizzes(ch);
    });
    return v2;
  }

  // Chain onto any existing preAdapt
  const prev = window.__ao_patch_preAdapt;
  window.__ao_patch_preAdapt = function (v2) {
    try { v2 = prev ? prev(v2) : v2; } catch (e) { console.warn('[AO] preAdapt(prev) failed:', e); }
    try { return patch(v2); } catch (e) { console.warn('[AO] token/assessment patch failed', e); return v2; }
  };
})();
