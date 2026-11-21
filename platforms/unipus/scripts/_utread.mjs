// _utread.mjs <unit> — 打开 UT → 再次作答 → 导出 26 题题干与选项
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const U = Number(process.argv[2] || 4);
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');for(const b of document.querySelectorAll('button,div,span,a')){if(/^(我知道了|知道了)$/.test(n(b.innerText)))b.click();}return 1;})()`, f.ctx).catch(() => {});
}
const tbf = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
await ev(`(()=>{const c=document.querySelector('[class*=catalog_drawer-close]');if(c)c.click();return 1;})()`, tbf.ctx).catch(() => {});
await sleep(1200);
const card = await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
 for(const c of cs){const img=c.querySelector('img');const s=img?decodeURIComponent(img.src||''):'';if(/UT/i.test(s)&&!/挑战/.test(s)){c.scrollIntoView({block:'center'});const b=c.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),status:c.getAttribute('data-lexical-node-status')};}}
 return null;})()`, tbf.ctx).catch(() => null);
console.log("card", JSON.stringify(card));
if (!card) { cdp.close(); process.exit(2); }
const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
const offA = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`, top.ctx).catch(() => ({ ox: 0, oy: 0 }));
await mouse(card.x + offA.ox, card.y + offA.oy);
await sleep(3500);
for (let k = 0; k < 8; k++) {
  let hit = false;
  for (const f of await frames()) {
    if (!f.ctx) continue;
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始答题|再次作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),t:n(e.innerText)};})()`, f.ctx).catch(() => null);
    if (p) { await mouse(p.x, p.y + (/pc\.html/.test(f.url) ? 0 : offA.oy)); console.log("clicked", p.t); hit = true; break; }
  }
  if (hit) break;
  await sleep(2000);
}
await sleep(6000);
let ex = null, n = 0;
for (let k = 0; k < 20; k++) {
  for (const f of await frames()) {
    if (!/testing\/diagnosis/.test(f.url) || !f.ctx) continue;
    n = await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`, f.ctx).catch(() => 0);
    if (n >= 20) { ex = f; break; }
  }
  if (ex) break;
  await sleep(2000);
}
console.log("exam", ex ? "ok" : "none", "questions", n);
if (!ex) { cdp.close(); process.exit(3); }
const qs = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 return items.map((q,i)=>{
  const t=(q.innerText||'').replace(/[ ]+/g,' ');
  const opts=[...q.querySelectorAll('[class*=chioceView_strongListView]')].map((r,j)=>String.fromCharCode(65+j)+':'+((r.innerText||'').replace(/[ ]+/g,' ').trim().slice(0,40)));
  return {i,stem:t.slice(0,220),opts:opts.length?opts:[],type:opts.length?'choice':'fill'};});})()`, ex.ctx).catch(e => String(e));
fs.writeFileSync("ut" + U + "-questions.json", JSON.stringify(qs, null, 1));
console.log(JSON.stringify(qs, null, 1).slice(0, 12000));
cdp.close();
