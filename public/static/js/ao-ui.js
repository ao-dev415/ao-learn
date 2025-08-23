<script>
(async function(){
  const $ = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>[...el.querySelectorAll(s)];

  // Load site + (optional) rag
  const site = await fetch('site.json', {cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
  if(!site){ document.body.innerHTML = `
    <div class="app"><div class="header-row">
      <div class="brand"><span class="dot"></span> Advice Only™ Bookstore (Preview)</div>
    </div><div class="main"><div class="article"><h1>Could not load site.json.</h1>
    <p class="small">Serve this folder with <code>python3 -m http.server 5500</code> and open <code>http://localhost:5500</code>.</p></div></div></div>`; 
    return;
  }

  // STATE
  let current = { ch:0, lo:0 };

  // Build shell
  document.body.innerHTML = `
    <div class="app">
      <div class="header-row">
        <div class="brand"><span class="dot"></span> Advice Only™ Bookstore (Preview)</div>
        <div class="topbar">
          <input id="ask" type="search" placeholder="Ask anything about the methodology… (placeholder)">
          <button class="pill active">Read</button>
          <button class="pill">A</button>
          <button class="pill">A+</button>
          <button class="pill">🌙</button>
        </div>
      </div>

      <aside class="left">
        <div class="card tree">
          <h4>Methodology</h4>
          <div id="treeTop" class="tree-top"></div>
          <div id="split" class="split-handle" title="Drag to resize"></div>
          <div class="tree-bottom">
            <div class="section-title">Site</div>
            <div class="card" style="padding:10px">
              <strong>About Quincy Hall, CFP®</strong>
              <div class="small">Objective retirement planning</div>
              <a href="https://adviceonly.info" target="_blank" class="small">adviceonly.info ↗</a>
              <div style="margin-top:8px"><a class="btn" href="https://adviceonly.info/contact-us" target="_blank">View profile</a></div>
            </div>

            <div class="card" style="padding:10px">
              <strong>Events</strong>
              <ul class="small" style="margin:.4rem 0 0 1rem">
                <li>Nov 3, 2025 — Platform Walkthrough (Online)</li>
                <li>Oct 1, 2025 — Advisor CE (Online)</li>
                <li>Oct 1, 2025 — Advisor CE (San Mateo)</li>
              </ul>
            </div>

            <div class="card map" style="padding:10px">
              <strong>Corte Madera Office</strong>
              <iframe loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=Corte%20Madera%2C%20CA&output=embed"></iframe>
              <div style="margin-top:8px"><a class="btn" href="https://adviceonly.info/contact-us" target="_blank">Contact</a></div>
            </div>
          </div>
        </div>
      </aside>

      <main class="main">
        <div class="article" id="article">
          <div class="small badge" id="crumb">Chapter • LO</div>
          <h1 id="title"></h1>
          <div id="content"></div>
        </div>
      </main>

      <aside class="right">
        <div class="card">
          <h4>Right rail</h4>
          <div><span class="badge">Alerts</span></div>
          <p class="small">“Site accessibility tutorial” lives here for now. Later: notifications for subscribed users.</p>
        </div>
      </aside>
    </div>
  `;

  // Tree builder
  function buildTree(){
    const root = $('#treeTop');
    root.innerHTML = '';
    site.chapters.forEach((ch, ci)=>{
      const wrap = document.createElement('div'); wrap.className='nav-ch';
      const chTitle = document.createElement('div');
      chTitle.className='ch-title';
      chTitle.innerHTML = `<span>Chapter ${ci+1} — ${ch.title}</span><span>▾</span>`;
      wrap.appendChild(chTitle);

      const los = document.createElement('div'); los.className='nav-los';
      ch.los.forEach((lo, li)=>{
        const a = document.createElement('a');
        a.href="#"; a.dataset.ci=ci; a.dataset.li=li;
        a.textContent = `${lo.title}`;
        a.onclick = (e)=>{ e.preventDefault(); select(ci, li, true); };
        los.appendChild(a);
      });
      wrap.appendChild(los);
      root.appendChild(wrap);
    });
  }

  // Content render (+ simple image token support)
  function render(ci, li){
    const ch = site.chapters[ci], lo = ch.los[li];
    $('#crumb').textContent = `Chapter ${ci+1} · LO ${li+1}`;
    $('#title').textContent = lo.h1 || lo.title;
    let html = lo.html || lo.body || '';

    // V1 image tokens — write [[img:filename.webp|alt=Your alt]]
    // Files must live in static/media/ch{N}/
    html = html.replace(/\[\[\s*img:([^\]|]+)(?:\|alt=([^\]]+))?\s*\]\]/g, (_,file,alt)=>{
      const folder = `static/media/ch${ci+1}/${file}`.replace(/\/\/+/g,'/');
      return `<figure class="img"><img src="${folder}" alt="${alt||''}"></figure>`;
    });

    // Bold-only lines become H3 (snippet anchors)
    html = html.replace(/(^|\n)\*\*(.+?)\*\*\s*$/gm, (_m,pre,txt)=>`${pre}<h3>${txt}</h3>`);

    // Render
    $('#content').innerHTML = html;
    // Active state in tree
    $$('.nav-los a').forEach(a=>{
      a.classList.toggle('active', +a.dataset.ci===ci && +a.dataset.li===li);
    });

    // tiny progress badge (local only)
    try{
      const key=`ao.progress.ch${ci+1}.lo${li+1}`;
      localStorage.setItem(key, '1');
    }catch{}
  }

  // Select helper with scrolling the tree into view
  function select(ci, li, push){
    current = {ch:ci, lo:li};
    render(ci, li);
    if(push) history.replaceState({}, '', `#ch=${ci+1}&lo=${li+1}`);
    const active = $(`.nav-los a[data-ci="${ci}"][data-li="${li}"]`);
    if(active) active.scrollIntoView({block:'nearest'});
  }

  // Restore hash if present
  function fromHash(){
    const m = location.hash.match(/ch=(\d+)&lo=(\d+)/);
    const ci = m ? Math.max(1, +m[1]) - 1 : 0;
    const li = m ? Math.max(1, +m[2]) - 1 : 0;
    return {ci: Math.min(ci, site.chapters.length-1), li: Math.min(li, site.chapters[ci]?.los.length-1 || 0)};
  }

  // Draggable split between treeTop and treeBottom
  (function splitDrag(){
    const handle = $('#split'); const top = $('#treeTop'); const box = handle.closest('.tree');
    let dragging=false, startY=0, startH=0;
    handle.addEventListener('mousedown', (e)=>{ dragging=true; startY=e.clientY; startH=top.offsetHeight; document.body.style.userSelect='none'; });
    window.addEventListener('mousemove', (e)=>{ if(!dragging) return; const dy=e.clientY-startY; const h=Math.max(80, Math.min(box.clientHeight-140, startH+dy)); top.style.height=h+'px'; });
    window.addEventListener('mouseup', ()=>{ dragging=false; document.body.style.userSelect=''; });
  })();

  buildTree();
  const {ci, li} = fromHash();
  select(ci, li, true);
})();
</script>
