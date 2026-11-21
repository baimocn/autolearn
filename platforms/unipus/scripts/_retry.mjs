// _retry.mjs — 在成绩页点「再次作答」→ 等考试 → 读题
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
let ex = (await frames()).find(f => /testing\/diagnosis/.test(f.url) && f.ctx);
if (!ex) { console.log("no exam frame"); process.exit(1); }
const click = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='再次作答'&&e.getBoundingClientRect().width>20);if(!v.length)return 'none';v[v.length-1].click();return 'clicked';})()`, ex.ctx).catch(e => String(e));
console.log("retry", click);
// 可能有确认弹窗
await sleep(2500);
for (let k = 0; k < 6; k++) {
  let hit = false;
  for (const f of await frames()) {
    const c = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('.ant-modal-confirm-btns .ant-btn-primary,button,div,span')].filter(e=>e.children.length<=1&&/^(确定|确认|继续作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
    if (c) { hit = true; break; }
  }
  if (hit) { console.log("confirmed"); break; }
  await sleep(1500);
}
// 等题目
let n = 0;
for (let k = 0; k < 25; k++) {
  ex = (await frames()).find(f => /testing\/diagnosis/.test(f.url) && f.ctx);
  if (ex) n = await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`, ex.ctx).catch(() => 0);
  if (n >= 20) break;
  await sleep(2000);
}
console.log("questions", n);
if (!ex || n < 10) { cdp.close(); process.exit(2); }
const qs = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 return items.map((q,i)=>{const t=(q.innerText||'').replace(/[ ]+/g,' ');
  const opts=[...q.querySelectorAll('[class*=chioceView_strongListView]')].map((r,j)=>String.fromCharCode(65+j)+':'+((r.innerText||'').replace(/[ ]+/g,' ').trim().slice(0,42)));
  const ins=[...q.querySelectorAll('input.answer_answerInput')].length;
  return {i,type:opts.length?'choice':(ins?'fill':'other'),stem:t.slice(0,210),opts};}).filter(x=>x.type!=='other');})()`, ex.ctx).catch(e => String(e));
fs.writeFileSync("ut-retry-questions.json", JSON.stringify(qs, null, 1));
if (Array.isArray(qs)) {
  console.log("usable", qs.length);
  qs.forEach(q => { console.log("--- Q" + q.i + " [" + q.type + "]"); console.log(q.stem); if (q.opts.length) console.log("  " + q.opts.join(" | ")); });
} else console.log(qs);
cdp.close();
