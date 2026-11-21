// _utanswer2.mjs "<A,B,C...>" — 按答案序列点选（索引对应 questionItem 顺序）
import { connect, sleep } from "./utlib.mjs";
const ANS = (process.argv[2] || "").split(",").map(s => s.trim().toUpperCase());
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
const ex = (await frames()).find(f => /testing\/diagnosis/.test(f.url) && f.ctx);
if (!ex) { console.log("no exam"); process.exit(1); }
const r = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const ks=${JSON.stringify(ANS)};let n=0;
 items.forEach((q,i)=>{
  const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
  if(!rows.length)return;
  const k=ks[i];
  const idx=(k&&"ABCD".includes(k[0]))?"ABCD".indexOf(k[0]):0;
  (rows[idx]||rows[0]).click();n++;
 });
 return {items:items.length,clicked:n};})()`, ex.ctx).catch(e => String(e));
console.log("answered", JSON.stringify(r));
await sleep(2000);
const prog = await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(\d+)\s*\/\s*(\d+)/);return m?m[0]:'n/a';})()`, ex.ctx).catch(() => 'err');
console.log("progress", prog);
cdp.close();
