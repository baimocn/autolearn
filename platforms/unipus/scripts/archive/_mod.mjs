import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
const r = await ev(`(()=>{
 const n=s=>(s||'').replace(/\s+/g,'');
 const hits=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&n(e.innerText)==='我知道了');
 return hits.map(e=>{const b=e.getBoundingClientRect();const cs=getComputedStyle(e);
  return {tag:e.tagName, cls:(e.className||'').toString().slice(0,60), x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2), w:Math.round(b.width), h:Math.round(b.height), vis:cs.visibility, op:cs.opacity, pe:cs.pointerEvents};});
})()`, top.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1));
// 点第一个
if (Array.isArray(r)&&r.length) {
  const t=r[0];
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:t.x,y:t.y},sessionId).catch(()=>{});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:t.x,y:t.y,button:"left",buttons:1,clickCount:1},sessionId);
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:t.x,y:t.y,button:"left",buttons:0,clickCount:1},sessionId);
  await sleep(2500);
  const left = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');return [...document.querySelectorAll('*')].filter(e=>e.children.length===0&&n(e.innerText)==='我知道了').length;})()`, top.ctx).catch(()=>-1);
  console.log("after click, 我知道了 left:", left);
}
cdp.close();
