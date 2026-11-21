import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(()=>{});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
for (let k = 0; k < 4; k++) {
  let clicked = 0;
  for (const f of await frames()) {
    if (!/pc\.html/.test(f.url)) continue;
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),txt:v[v.length-1].innerText};})()`, f.ctx).catch(()=>null);
    if (p) { await mouse(p.x, p.y); clicked++; await sleep(1200); }
  }
  console.log("round", k, "clicked", clicked);
  const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
  if (!tb) { console.log("no tb"); break; }
  const c = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(()=>null);
  if (c) { await mouse(c.x, c.y); await sleep(1000); }
  await sleep(2500);
  const st = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return {blocks:bs.length,nonempty:bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length,txt:document.body.innerText.length};})()`, tb.ctx).catch(e=>String(e));
  console.log(" after", JSON.stringify(st));
}
cdp.close();
