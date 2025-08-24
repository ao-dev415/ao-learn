window.AO = (function(){
  const AO = {};

  // ---------- Data loading (full -> preview fallback) ----------
  AO.loadSite = async function(){
    const tryLoad = async (url) => {
      try {
        const r = await fetch(url, {cache:'no-store', credentials:'same-origin'});
        if (!r.ok) return null;
        return await r.json();
      } catch(e){ return null; }
    };
    return (await tryLoad('full/site.json')) || (await tryLoad('site.json'));
  };

  AO.loadChunks = async function(){
    try{
      const r = await fetch('static/rag/chunks.json', {cache:'no-store', credentials:'same-origin'});
      if (!r.ok) return [];
      return await r.json();
    }catch(e){ return []; }
  };

  // ---------- Progress (localStorage) ----------
  const LS_KEY = 'AOProgress';
  const now = ()=> Date.now();
  let session = { current:null, start:0 };

  AO.getProgress = function(){
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || { paused:false, views:{}, totals:{} }; }
    catch(e){ return { paused:false, views:{}, totals:{} }; }
  };
  AO.saveProgress = function(p){ localStorage.setItem(LS_KEY, JSON.stringify(p)); };

  AO.beginLO = function(chIdx, loIdx){
    const p = AO.getProgress();
    session.current = `ch${chIdx}-lo${loIdx}`;
    session.start = now();
    if (!p.views[session.current]) p.views[session.current] = {ms:0, opens:0};
    p.views[session.current].opens += 1;
    AO.saveProgress(p);
  };

  AO.endLO = function(){
    if (!session.current) return;
    const p = AO.getProgress();
    const d = now() - (session.start||now());
    if (p.paused) { session.current=null; return; }
    if (!p.views[session.current]) p.views[session.current] = {ms:0, opens:0};
    p.views[session.current].ms += d;
    AO.saveProgress(p);
    session.current=null;
  };

  window.addEventListener('visibilitychange', ()=>{ if(document.hidden) AO.endLO(); });

  AO.dump = ()=> AO.getProgress();

  AO.exportJSON = function(){
    const blob = new Blob([JSON.stringify(AO.dump(), null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ao-progress-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  AO.exportCSV = function(site){
    // Flatten to: chapter, lo, key, opens, seconds
    const p = AO.getProgress();
    const rows = [["chapter","lo","key","opens","seconds"]];
    (site?.chapters||[]).forEach((ch,ci)=>{
      (ch.los||[]).forEach((lo,li)=>{
        const key = `ch${ci+1}-lo${li+1}`;
        const v = p.views[key] || {ms:0, opens:0};
        rows.push([ch.title, lo.title, key, String(v.opens||0), (Math.round((v.ms||0)/1000)).toString()]);
      });
    });
    const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ao-progress-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  // ---------- Search ----------
  AO.buildIndexFromSite = function(site){
    const out = [];
    (site?.chapters||[]).forEach((ch,ci)=>{
      (ch.los||[]).forEach((lo,li)=>{
        // include LO level
        out.push({
          type:'lo',
          ch:ci+1, lo:li+1,
          title:`${ch.title} — ${lo.title}`,
          snippet: lo.preview || '',
        });
        // include snippets if present
        (lo.snippets||[]).forEach(s=>{
          out.push({
            type:'snippet',
            ch:ci+1, lo:li+1,
            title:s.title || lo.title,
            snippet:(s.body||'').slice(0,240)
          });
        });
      });
    });
    return out;
  };

  AO.buildIndex = async function(site){
    const chunks = await AO.loadChunks(); // may be []
    // normalize any chunk shape we find
    const fromChunks = Array.isArray(chunks) ? chunks.map(c => ({
      type:'chunk',
      ch: c.chapterIndex || c.ch || 0,
      lo: c.loIndex || c.lo || 0,
      title: c.title || c.loTitle || c.chapterTitle || 'Snippet',
      snippet: (c.text || c.body || '').slice(0,240)
    })) : [];
    return AO.buildIndexFromSite(site).concat(fromChunks);
  };

  AO.search = function(index, q){
    q = (q||'').trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const score = (text)=>{
      const t = (text||'').toLowerCase();
      let s = 0;
      for (const term of terms){
        if (t.includes(term)) s += 1;
      }
      return s;
    };
    return index
      .map(hit => ({hit, s: score(hit.title)+' '+score(hit.snippet), sNum: score(hit.title)*2 + score(hit.snippet)}))
      .filter(x => x.sNum>0)
      .sort((a,b)=>b.sNum - a.sNum)
      .slice(0,30)
      .map(x=>x.hit);
  };

  // ---------- UI helpers ----------
  AO.loLabel = function(loTitle){
    const t = (loTitle||'').trim();
    const m = t.match(/(\d+\.\d+)/);
    if (m) {
      const rest = t.replace(m[0], '').replace(/^[-—:\s]+/,'').trim();
      return `${m[0]} — ${rest || ''}`.trim();
    }
    return t || 'Untitled';
  };

  AO.chapterOrderIndex = function(ch, i){
    if (typeof ch.index==='number') return ch.index;
    const ct = (ch.title||'').trim();
    let m = /^Chapter\s+(\d+)/i.exec(ct);
    if (m) return parseInt(m[1],10);
    let best = Infinity;
    (ch.los||[]).forEach(lo=>{
      const ts = (lo.title||'').trim().match(/\b(\d+\.\d+)\b/g);
      if (ts) ts.forEach(n=>{
        const major = parseInt(n.split('.')[0],10);
        if (!Number.isNaN(major) && major<best) best = major;
      });
    });
    if (best!==Infinity) return best;
    return 1000+i;
  };

  AO.installSplitter = function(root){
    const gutter = root.querySelector('.gutter');
    if (!gutter) return;
    let dragging=false, startX=0, startW=0;
    gutter.addEventListener('mousedown', (e)=>{
      dragging = true; startX = e.clientX; startW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav'),10);
      document.body.style.userSelect='none';
    });
    window.addEventListener('mousemove', (e)=>{
      if(!dragging) return;
      const dx = e.clientX - startX;
      const w = Math.min(480, Math.max(220, startW + dx));
      document.documentElement.style.setProperty('--nav', `${w}px`);
    });
    window.addEventListener('mouseup', ()=>{
      if(dragging){ dragging=false; document.body.style.userSelect='auto'; }
    });
    // touch
    gutter.addEventListener('touchstart', (e)=>{
      const t = e.touches[0]; dragging=true; startX=t.clientX; startW=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav'),10);
    }, {passive:true});
    window.addEventListener('touchmove', (e)=>{
      if(!dragging) return;
      const t = e.touches[0]; const dx = t.clientX - startX;
      const w = Math.min(480, Math.max(220, startW + dx));
      document.documentElement.style.setProperty('--nav', `${w}px`);
    }, {passive:true});
    window.addEventListener('touchend', ()=>{ dragging=false; });
  };

  // ---------- Page initializers ----------
  AO.initIndex = async function(){
    const site = await AO.loadSite();
    const root = document.querySelector('.wrap');
    const navEl = document.getElementById('nav');
    const mainEl = document.getElementById('main');

    AO.installSplitter(root);

    // Build nav
    const chapters = (site?.chapters||[])
      .map((ch,i)=>({ch,ord:AO.chapterOrderIndex(ch,i)}))
      .sort((a,b)=>a.ord-b.ord)
      .map(x=>x.ch);

    navEl.innerHTML = '';
    const list = document.createElement('ul');
    chapters.forEach((ch, chIdx)=>{
      list.append(Object.assign(document.createElement('h3'), {textContent: ch.title || `Chapter ${chIdx+1}`}));
      (ch.los||[]).forEach((lo, loIdx)=>{
        const btn = document.createElement('button');
        btn.className = 'lo';
        btn.textContent = AO.loLabel(lo.title);
        btn.onclick = ()=>{
          renderMain(chIdx, loIdx);
          location.hash = `#ch${chIdx+1}-lo${loIdx+1}`;
          setActive(btn);
        };
        list.append(Object.assign(document.createElement('li'), {appendChild: (el)=>{}}));
        const li = document.createElement('li');
        li.appendChild(btn);
        list.append(li);
      });
    });
    navEl.append(list);

    // Search
    const index = await AO.buildIndex(site);
    const search = document.getElementById('ao-search');
    const results = document.getElementById('ao-search-results');
    const show = (arr)=>{
      results.innerHTML = '';
      if(!arr.length){ results.classList.remove('show'); return; }
      arr.forEach(hit=>{
        const item = document.createElement('div');
        item.className='item';
        item.innerHTML = `<div class="hit-title">${hit.title}</div><div class="hit-snippet">${hit.snippet||''}</div>`;
        item.onclick = ()=>{
          const hash = `#ch${hit.ch||1}-lo${hit.lo||1}`;
          location.hash = hash;
          results.classList.remove('show');
          openFromHash();
        };
        results.appendChild(item);
      });
      results.classList.add('show');
    };
    search.addEventListener('input', ()=>{ show(AO.search(index, search.value)); });
    search.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ results.classList.remove('show'); }});

    // Render main
    function setActive(btn){
      navEl.querySelectorAll('button[aria-current="true"]').forEach(b=>b.setAttribute('aria-current','false'));
      btn?.setAttribute('aria-current','true');
      btn?.scrollIntoView({block:'nearest', inline:'nearest'});
    }

    function renderMain(chIdx, loIdx){
      AO.endLO();
      const ch = chapters[chIdx], lo = ch?.los?.[loIdx];
      if(!ch||!lo){ mainEl.innerHTML='<div class="muted">Not found.</div>'; return; }
      mainEl.innerHTML='';
      const h1 = document.createElement('h1'); h1.textContent = `${ch.title} — ${lo.title}`; mainEl.append(h1);
      const lead = document.createElement('p'); lead.className='lead'; lead.textContent = lo.preview || ''; mainEl.append(lead);
      if (Array.isArray(lo.snippets) && lo.snippets.length){
        lo.snippets.forEach(s=>{
          if (s.title){ const h2=document.createElement('h2'); h2.textContent=s.title; mainEl.append(h2); }
          if (s.body){ const p=document.createElement('p'); p.textContent=s.body; mainEl.append(p); }
          if (s.image && s.image.src){
            const fig = document.createElement('figure'); fig.style.margin='12px 0';
            const img = document.createElement('img'); img.src=s.image.src; img.alt=s.image.alt||''; fig.append(img);
            if (s.image.caption){ const cap=document.createElement('figcaption'); cap.className='muted'; cap.textContent=s.image.caption; fig.append(cap); }
            mainEl.append(fig);
          }
        });
      }
      AO.beginLO(chIdx+1, loIdx+1);
    }

    function openFromHash(){
      const m = location.hash.match(/^#ch(\d+)-lo(\d+)$/);
      const ch = (m?+m[1]:1)-1, lo = (m?+m[2]:1)-1;
      const btns = Array.from(navEl.querySelectorAll('button.lo'));
      let flat=0, target=0, found=false;
      chapters.forEach((c,ci)=> (c.los||[]).forEach((l,li)=> {
        if(ci===ch && li===lo){ target=flat; found=true; }
        flat++;
      }));
      if (found) {
        renderMain(ch, lo);
        setActive(btns[target]);
      }
    }
    window.addEventListener('hashchange', openFromHash);
    if (!location.hash) location.hash = '#ch1-lo1';
    openFromHash();
  };

  AO.initMyData = async function(){
    const site = await AO.loadSite();
    const root = document.getElementById('mydata');
    const p = AO.getProgress();

    const btnPause = document.getElementById('btn-pause');
    const btnClear = document.getElementById('btn-clear');
    const btnJSON  = document.getElementById('btn-json');
    const btnCSV   = document.getElementById('btn-csv');

    btnPause.onclick = ()=>{
      const s = AO.getProgress();
      s.paused = !s.paused; AO.saveProgress(s);
      btnPause.textContent = s.paused ? 'Resume tracking' : 'Pause tracking';
      render();
    };
    btnClear.onclick = ()=>{
      localStorage.removeItem('AOProgress');
      render();
    };
    btnJSON.onclick = ()=> AO.exportJSON();
    btnCSV.onclick  = ()=> AO.exportCSV(site);

    function badgeFor(ms){
      if (ms>=30*60*1000) return '🟢 Deep exposure (30+ min)';
      if (ms>=10*60*1000) return '🟡 Solid exposure (10+ min)';
      if (ms>=3*60*1000)  return '🔵 Light exposure (3+ min)';
      if (ms>=60*1000)    return '⚪ Getting started (1+ min)';
      return '• Skim';
    }

    function render(){
      root.innerHTML='';
      const hdr = document.createElement('div'); hdr.className='muted';
      hdr.textContent = AO.getProgress().paused ? 'Tracking is paused' : 'Tracking is active';
      root.append(hdr);

      (site?.chapters||[]).forEach((ch,ci)=>{
        const card = document.createElement('div'); card.className='card'; card.style.padding='12px'; card.style.margin='12px 0';
        const h = document.createElement('h3'); h.textContent = ch.title; card.append(h);
        (ch.los||[]).forEach((lo,li)=>{
          const key = `ch${ci+1}-lo${li+1}`; const v = AO.getProgress().views[key] || {ms:0, opens:0};
          const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.padding='.35rem 0'; row.style.borderTop='1px solid var(--border)';
          const left = document.createElement('div'); left.textContent = AO.loLabel(lo.title);
          const right = document.createElement('div'); right.className='muted'; right.textContent = `${badgeFor(v.ms)} • ${Math.round((v.ms||0)/1000)}s • ${v.opens||0} open(s)`;
          row.append(left,right);
          card.append(row);
        });
        root.append(card);
      });
    }
    render();
  };

  return AO;
})();
