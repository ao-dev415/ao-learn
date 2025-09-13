
// scripts/ao-patch.js
// Safe runtime patch: no inline edits, no minifier issues.
// - Warms REGISTRY (non-blocking)
// - Promotes chapter assessments (first assessment sub-objective -> chapter.assessment)
// - Normalizes quizzes so {ref/src} render without inlined payloads
// - Monkey-patches __ao_adaptV2ToLegacy after it exists

<script>
/* AO: full->public fallback */
(function () {
  const p = new URLSearchParams(location.search);
  const wantsFull = p.has('full');
  const origFetch = window.fetch;

  window.fetch = async function(input, init) {
    if (typeof input === 'string' && input.endsWith('/full/site.json')) {
      let r = await origFetch(input, init);
      if (!r.ok) {
        console.warn('[AO] full/site.json missing; falling back to site.json');
        // Remove ?full=1 so the UI reflects public mode
        if (wantsFull) {
          p.delete('full');
          history.replaceState(null, '', location.pathname + (p.size ? '?' + p.toString() : ''));
        }
        return origFetch('site.json', init);
      }
      return r;
    }
    return origFetch(input, init);
  };
})();
</script>


(function registryWarmLoad(){
  var g = window;
  if (g.__aoEnsureRegistry) return;
  g.REGISTRY = g.REGISTRY || null;
  g.__aoEnsureRegistry = function(){
    if (g.REGISTRY) return Promise.resolve(g.REGISTRY);
    return fetch('data/registry.json', { cache: 'no-store' })
      .then(function(r){ return r.ok ? r.json() : { quizzes:{}, assessments:{} }; })
      .catch(function(){ return { quizzes:{}, assessments:{} }; })
      .then(function(j){ g.REGISTRY = j; return j; });
  };
  // kick off load but don't block anything
  g.__aoEnsureRegistry();
})();

function __ao_patch_preAdapt(v2){
  var REG = window.REGISTRY || null; // may be null when this runs
  (v2.chapters || []).forEach(function(ch){
    // Promote first section-level assessment to chapter.assessment
    if (!ch.assessment) {
      var sec = (ch.sections || []).find(function(s){
        return (s.sub_objectives || []).some(function(so){
          return so && so.type === 'assessment' && (so.assessment || so.src || so.ref);
        });
      });
      if (sec) {
        var so = (sec.sub_objectives || []).find(function(x){ return x && x.type === 'assessment'; });
        var ref = (so && (so.ref || (so.assessment && so.assessment.id))) || null;
        var regA = (REG && ref && REG.assessments) ? REG.assessments[ref] : null;
        // keep on one line to avoid split mistakes
        var src = (so.assessment && so.assessment.src) || so.src || (regA && regA.src) || (ref ? ('data/assessments/' + ref + '.json') : null);

        if (src) {
          ch.assessment = {
            id: ref || (so.assessment && so.assessment.id) || 'assessment',
            title: (sec && sec.title) || 'Knowledge Check',
            href: '/' + (ref || 'assessment'),
            src: src
          };
          ch.items = Array.isArray(ch.items) ? ch.items : [];
          if (!ch.items.some(function(it){ return it && it.type === 'assessment'; })) {
            ch.items.push({ type: 'assessment', title: ch.assessment.title, href: ch.assessment.href });
          }
        }
      }
    }

    // Normalize quizzes so they render even if payloads aren’t inlined
    (ch.sections || []).forEach(function(sec){
      sec.sub_objectives = (sec.sub_objectives || []).map(function(so){
        if (!so || so.type !== 'quiz') return so;
        var qref = so.ref || so.id || null;
        var regQ = (REG && qref && REG.quizzes) ? REG.quizzes[qref] : null;
        var quizSrc = so.src || (regQ && regQ.src) || (qref ? ('data/quizzes/' + qref + '.json') : null);
        if (!so.quiz) so.quiz = {};
        if (!so.quiz.src) so.quiz.src = quizSrc;
        return so;
      });
    });
  });
  return v2;
}

(function monkeyPatch(){
  function tryPatch(){
    var old = window.__ao_adaptV2ToLegacy;
    if (typeof old !== 'function') return false;
    if (old.__aoPatched) return true;
    window.__ao_adaptV2ToLegacy = function(v2){
      try { v2 = __ao_patch_preAdapt(v2); } catch(e){ console.warn('[AO] preAdapt failed:', e); }
      return old(v2);
    };
    window.__ao_adaptV2ToLegacy.__aoPatched = true;
    return true;
  }
  if (!tryPatch()){
    var attempts = 0, id = setInterval(function(){
      if (tryPatch() || ++attempts > 200) clearInterval(id);
    }, 25);
  }
})();
