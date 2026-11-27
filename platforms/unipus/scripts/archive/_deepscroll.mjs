import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
if (!tb) { console.log("no tb"); process.exit(1); }
const n0 = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;})()`, tb.ctx).catch(()=>0);
console.log("before nonempty", n0);
for (let i=0;i<30;i++){
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.85));return 1;})()`, tb.ctx).catch(()=>{});
  await sleep(1500);
}
const r = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const ne=bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;return {blocks:bs.length,nonempty:ne,txt:document.body.innerText.length};})()`, tb.ctx).catch(e=>String(e));
console.log("after", JSON.stringify(r));
cdp.close();
