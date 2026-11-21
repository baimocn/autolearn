// challenge-only.mjs <unit> <answers> — 当前单元挑战（改进帧检测）
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
const U = Number(process.argv[2]);
const CHA = (process.argv[3] || "").split(",").map(s => s.trim().toUpperCase());
const log = (...a) => console.log(`[c${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 100)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
let tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
if (!tb) { log("NO TB"); process.exit(1); }
const dismiss = async () => {
  for (const f of await frames()) {
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (p) { await mouse(p.x, p.y); await sleep(1000); }
  }
};
await dismiss();
// 记录现有 testing 帧
const oldUrls = new Set((await frames()).filter(f => /testing|\/exam\//.test(f.url)).map(f => f.url.split("?")[0]));
// 点挑战卡
const clicked = await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
  for(const c of cs){const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
    if(dec.includes('挑战')){(img||c).click();return 1;}}
  return 0;})()`, tb.ctx).catch(() => 0);
log("卡点击:", clicked);
if (!clicked) { log("无挑战卡"); process.exit(2); }
await sleep(4000);
await dismiss();
// 开始挑战
let started = false;
for (let attempt = 0; attempt < 5 && !started; attempt++) {
  for (const f of await frames()) {
    const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始挑战|再次挑战|开始答题)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
    if (r) { started = true; break; }
  }
  if (!started) { await dismiss(); await sleep(2500); }
}
log("开始挑战:", started);
// 等新 testing 帧
let ex = null;
for (let k = 0; k < 30; k++) {
  await sleep(1000);
  for (const f of await frames()) {
    if (/testing|\/exam\//.test(f.url) && f.ctx && !oldUrls.has(f.url.split("?")[0])) { ex = f; break; }
  }
  if (ex) break;
}
if (!ex) { log("新考试帧未出现"); process.exit(3); }
log("exam:", ex.url.slice(45, 85));
// 等题目加载并读题
let qs = [];
for (let k = 0; k < 15; k++) {
  await sleep(2000);
  qs = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
    return items.map((q,i)=>({i,stem:(q.innerText||'').replace(/\\s+/g,' ').slice(0,180)}));})()`, ex.ctx).catch(() => []);
  if (qs && qs.length && qs.some(x => x.stem.replace(/[0-9.\sABCD]/g, "").length > 20)) break;
}
log("题数:", qs.length);
console.log(JSON.stringify(qs, null, 1).slice(0, 2600));
// 作答
const ans = await ev(`(async()=>{
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  const ks=${JSON.stringify(CHA)};
  items.forEach((q,i)=>{
    const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
    if(rows.length){const key=ks[i];const row=(key&&"ABCD".includes(key[0]))?rows["ABCD".indexOf(key[0])]:rows[0];
      if(row)row.click();return;}
    const el=q.querySelector('input,textarea');
    if(el){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'x');
      el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  });
  return items.length;})()`, ex.ctx).catch(() => 0);
log("作答:", ans);
await sleep(1500);
// 提交
let sub = false;
for (const f of await frames()) {
  const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>10);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
  if (r) { sub = true; break; }
}
log("提交:", sub);
await sleep(3500);
// 确定（ant-btn-primary 全帧）
let conf = 0;
for (let k = 0; k < 8 && !conf; k++) {
  for (const f of await frames()) {
    conf = await ev(`(()=>{const b=document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');if(!b)return 0;b.click();return 1;})()`, f.ctx).catch(() => 0);
    if (conf) break;
  }
  if (!conf) await sleep(1500);
}
log("确定:", conf);
await sleep(5000);
// 成绩提交
let posted = false;
for (let k = 0; k < 12; k++) {
  for (const f of await frames()) {
    const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
    if (r) { posted = true; break; }
  }
  if (posted) break;
  await sleep(1800);
}
log("成绩提交:", posted);
await sleep(3000);
for (const f of await frames()) {
  const t = await ev(`(()=>{const t2=document.body.innerText;const m=t2.replace(/\\s+/g,' ').match(/(本轮成绩|提交成功|成绩提交成功)[^。]{0,50}/);return m?m[0]:'';})()`, f.ctx).catch(() => "");
  if (t) log("RESULT:", t);
}
const fs = await import("node:fs");
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync(`cha-u${U}-new.png`, Buffer.from(data, "base64"));
cdp.close();
