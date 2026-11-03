// retry-unit.mjs <unit> — 在成绩页点“再次作答”，进入新一次作答
import { connect, examOffset, sleep } from "./utlib.mjs";
import fs from "node:fs";
const cur = JSON.parse(fs.readFileSync("ut-current.json","utf8"));
const L = await connect(cur.targetId);
const { ev, frames, mouse } = L;
const log=(...a)=>console.log(...a);
const off = await examOffset(L);
log("off", JSON.stringify(off));

async function examFrame(){ return (await frames()).find(f=>/testing\/(diagnosis|challenge)\/book/.test(f.url)&&f.ctx); }
let ex = await examFrame();
if(!ex){ log("no exam"); process.exit(1); }

const cardState = async () => String(await ev(`(()=>{const c=document.querySelector('[class*=answer-card_container]');return c?(c.innerText||'').replace(/\\s+/g,' ').slice(-24):'?';})()`, ex.ctx) || "");
log("card before:", await cardState());

// 找“再次作答”
const btn = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='再次作答'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, ex.ctx);
log("再次作答 @", JSON.stringify(btn));
if(!btn){ log("no retry btn"); process.exit(1); }
await mouse(btn.x+off.ox, btn.y+off.oy);
await sleep(3000);

// 可能弹确认
for(const f of await frames()){
  const c = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const r=[...document.querySelectorAll('.ant-modal-root')].find(e=>/确定|再次作答|重新/.test(e.innerText||''));if(!r)return null;const b=[...r.querySelectorAll('button')].find(x=>n(x.innerText)==='确定');if(!b)return null;const q=b.getBoundingClientRect();return {x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2)};})()`, f.ctx).catch(()=>null);
  if(c){ const o2 = /textbook/.test(f.url) ? {ox:0,oy:0} : off; log("confirm modal"); await mouse(c.x+o2.ox, c.y+o2.oy); await sleep(2500); break; }
}
await sleep(3000);
ex = await examFrame();
log("card after:", await cardState());
const n = await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`, ex.ctx);
log("questions:", n);
L.cdp.close();
