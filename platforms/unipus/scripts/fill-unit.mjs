// fill-unit.mjs <unit> — 按 key-U<n>.json 作答并提交
import { connect, examOffset, sleep } from "./utlib.mjs";
import fs from "node:fs";
const U = Number(process.argv[2]);
const KEY = JSON.parse(fs.readFileSync(`key-U${U}.json`, "utf8"));
const cur = JSON.parse(fs.readFileSync("ut-current.json", "utf8"));
const L = await connect(cur.targetId);
const { ev, frames, mouse } = L;
const log = (...a) => console.log(...a);

let ex = (await frames()).find((f) => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx && cur.examUrl && f.url.slice(0, 90) === cur.examUrl.slice(0, 90));
if (!ex) ex = (await frames()).filter((f) => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx).pop();
if (!ex) { log("no exam frame"); process.exit(1); }
const N = await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`, ex.ctx);
log("questions:", N);

const setInput = (idx, val) => ev(`(()=>{
  const q=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')][${idx - 1}];
  if(!q) return 'no q';
  const el=q.querySelector('input,textarea'); if(!el) return 'no input';
  el.scrollIntoView({block:'center'});
  const proto = el.tagName==='TEXTAREA'? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(el, ${JSON.stringify(val)});
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
  return 'ok';
})()`, ex.ctx);

const clickOpt = (idx, letter) => ev(`(()=>{
  const q=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')][${idx - 1}];
  if(!q) return 'no q';
  const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
  const row=rows[${JSON.stringify(letter)}.charCodeAt(0)-65];
  if(!row) return 'no row('+rows.length+')';
  row.scrollIntoView({block:'center'});
  row.click(); return 'ok';
})()`, ex.ctx);

for (const [k, v] of Object.entries(KEY)) {
  const i = Number(k);
  const r = v.length === 1 && /^[A-D]$/.test(v) ? await clickOpt(i, v) : await setInput(i, v);
  if (r !== "ok" && r !== true) log(`  Q${i} -> ${r}`);
  await sleep(280);
}
const stat = await ev(`(()=>{const c=document.querySelector('[class*=answer-card_progress]');return c?c.innerText.replace(/\\s+/g,'').slice(0,20):'?';})()`, ex.ctx);
log("progress:", stat);

// 提交
const off = await examOffset(L);
log("examOffset:", JSON.stringify(off));
const sub = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('span,button,div')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const r=e.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`, ex.ctx);
log("提交:", JSON.stringify(sub));
await mouse(sub.x + off.ox, sub.y + off.oy);
await sleep(2500);

// 确认
let confirmed = false;
for (let i = 0; i < 10 && !confirmed; i++) {
  for (const f of await frames()) {
    const oy = /textbook/.test(f.url) ? 0 : off.oy;
    const c = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const root=[...document.querySelectorAll('.ant-modal-root')].find(e=>/确定要提交|确认提交/.test(e.innerText||''));if(!root)return null;const b=[...root.querySelectorAll('button')].find(x=>n(x.innerText)==='确定');if(!b)return null;const r=b.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`, f.ctx).catch(() => null);
    if (c) { log("确定 @", c.x, c.y, f.url.slice(45, 65)); await mouse(c.x, c.y + oy); confirmed = true; break; }
  }
  if (!confirmed) await sleep(700);
}
log("confirmed:", confirmed);

// 等成绩
let txt = "";
for (let i = 0; i < 20; i++) {
  await sleep(1200);
  txt = String(await ev(`document.body.innerText.replace(/\\s+/g,' ')`, ex.ctx).catch(() => ""));
  if (/成绩|得分/.test(txt)) break;
}
const m = txt.match(/你的最终得分是[^。]*。?[^。]*。/);
log("RESULT:", m ? m[0] : txt.slice(0, 200));
const { data } = await L.cdp.send("Page.captureScreenshot", { format: "png" }, L.sessionId);
fs.writeFileSync(`score-U${U}.png`, Buffer.from(data, "base64"));
L.cdp.close();
