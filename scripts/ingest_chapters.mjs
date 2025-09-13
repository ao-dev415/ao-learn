import fs from 'node:fs';
import path from 'node:path';
const root='chapters'; const out='content/site.v2.json';
function ex(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function rd(p){ return fs.readFileSync(p,'utf8'); }
function wrJSON(p,o){ fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p, JSON.stringify(o,null,2)); }
function nat(a,b){ return a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'}); }
function isMD(n){ return /\.(md|markdown)$/i.test(n); }
function isHTML(n){ return /\.(html?|htm)$/i.test(n); }
function parseFM(src){ const m=src.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/); if(!m) return {fm:{}, body:src}; const raw=m[1], body=m[2]; const fm={}; raw.split(/\r?\n/).forEach(l=>{ const k=l.match(/^\s*([A-Za-z0-9_\-]+)\s*:\s*(.+)\s*$/); if(k){ let v=k[2].trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); fm[k[1]]=v; } }); return {fm, body}; }
function mdToHTML(md){ if(!md) return ''; if (/<[a-z][\s\S]*>/i.test(md)) return md; return md.split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,' ')}</p>`).join('\n'); }
function readChapter(dir){
  const metaPath=path.join(dir,'chapter.json'); const meta=ex(metaPath)?JSON.parse(rd(metaPath)):{};
  const files=fs.readdirSync(dir).filter(f=>!f.startsWith('.')).sort(nat);
  const loFiles=files.filter(f=>(isMD(f)||isHTML(f)) && !/^index\./i.test(f));
  const sections = loFiles.map(f=>{
    const {fm, body} = parseFM(rd(path.join(dir,f)));
    const html = isMD(f)?mdToHTML(body):body;
    return {
      title: fm.title || f.replace(/\.[^.]+$/,'').replace(/[-_]/g,' '),
      preview_public_html: fm.preview ? `<p>${fm.preview}</p>` : '',
      section_public_html: html,
      sub_objectives: fm.quiz ? [{ type:'quiz', ref: fm.quiz, title:'Quick Check' }] : []
    };
  });
  const ch = { title: meta.title || path.basename(dir).replace(/^[0-9]+[-_]?/,'').replace(/[-_]/g,' '), sections };
  if (meta.assessmentRef) {
    ch.sections.push({
      title: 'Chapter Assessment',
      preview_public_html: '',
      section_public_html: '<p>Begin the chapter assessment.</p>',
      sub_objectives: [{ type:'assessment', ref: meta.assessmentRef }]
    });
  }
  return ch;
}
function main(){
  if(!ex(root)){ console.log('[ingest] chapters/ not found — skipping'); return; }
  const dirs=fs.readdirSync(root).filter(d=>fs.statSync(path.join(root,d)).isDirectory()).sort(nat);
  const chapters = dirs.map(d=>readChapter(path.join(root,d)));
  const site = { book:{title:'Advice-Only Course'}, events:[], chapters };
  wrJSON(out, site);
  console.log(`[ingest] wrote ${out} from ${chapters.length} chapter(s)`);
}
try{ main(); }catch(e){ console.error(e); process.exit(1); }
