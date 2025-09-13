(function(){
  async function boot(){
    try{
      const resp = await fetch('dist/seo.json', { cache: 'no-store' });
      if (!resp.ok) { return; }
      const seo = await resp.json();
      function apply(route){
        const data = seo[route];
        let tag = document.getElementById('ao-jsonld');
        if (!data) { if (tag) tag.remove(); return; }
        if (!tag) { tag = document.createElement('script'); tag.id='ao-jsonld'; tag.type='application/ld+json'; document.head.appendChild(tag); }
        tag.textContent = JSON.stringify(data);
      }
      apply(location.hash || '#home');
      window.addEventListener('hashchange', ()=>apply(location.hash || '#home'));
    }catch(e){
      // optional
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();