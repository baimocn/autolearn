import { connect } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const r = await ev(`(()=>{
 const vs=[...document.querySelectorAll('video')];
 const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
 return {videos:vs.map(v=>({src:(v.src||'').slice(0,80),dur:v.duration||0,paused:v.paused,cur:v.currentTime||0})),
  mediaBlocks:bs.map((b,i)=>({i,hasV:b.querySelectorAll('video').length,hasA:b.querySelectorAll('audio').length,len:(b.innerText||'').length})).filter(x=>x.hasV||x.hasA),
  lexical:[...document.querySelectorAll('[data-lexical-node-type]')].reduce((a,e)=>{const t=e.getAttribute('data-lexical-node-type');a[t]=(a[t]||0)+1;return a;},{})};
})()`, tb.ctx).catch(e=>"ERR "+String(e).slice(0,120));
console.log(JSON.stringify(r,null,1).slice(0,3000));
cdp.close();
