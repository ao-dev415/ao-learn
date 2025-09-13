import fs from 'node:fs';
import path from 'node:path';
const site = JSON.parse(fs.readFileSync('dist/full/site.json','utf8'));
const outDir = 'dist/rag';
fs.mkdirSync(outDir, { recursive: true });
function plain(s=''){ return String(s).replace(/```[\s\S]*?```/g,' ').replace(/`([^`]+)`/g,'$1').replace(/<\/?(p|strong|em|b|i|u|h\d|ul|ol|li|br|hr|div)[^>]*>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1').replace(/_([^_]+)_/g,'$1').replace(/^\s*#+\s*/gm,'').replace(/\s+/g,' ').trim(); }
const docs=[];
(site.chapters||[]).forEach((ch,ci)=>{
  (ch.los||[]).forEach((lo,li)=>{
    const id=`ch${ci+1}.lo${li+1}`; const url=`#ch${ci+1}-lo${li+1}`;
    const title = lo.title || `Learning Objective ${ci+1}.${li+1}`;
    const parts=[]; if(lo.preview) parts.push(plain(lo.preview)); (lo.snippets||[]).forEach(s=>{ if(s?.title) parts.push(plain(s.title)); if(s?.body) parts.push(plain(s.body)); });
    const text=parts.join(' ').trim();
    docs.push({ id, url, title, text });
  });
});
fs.writeFileSync(path.join(outDir,'index.json'), JSON.stringify({docs}, null, 2));
console.log('[rag] wrote dist/rag/index.json');
