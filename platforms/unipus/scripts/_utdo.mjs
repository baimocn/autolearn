// _utdo.mjs <unit> — 通用 UT 流程：点 UT 卡 → 开始答题 → 26题 → JS提交 → 确认 → 出分
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const U = Number(process.argv[2] || 6);
const log = (...a) => console.log("[ut" + U + "]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 120)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER"); process.exit(2); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const tbf = () => frames().then(fs => fs.find(f => /textbook\/book/.test(f.url) && f.ctx));
let tb = await tbf();
if (!tb || !tb.url.includes(CH[U])) { log("WRONG CHAPTER", tb && tb.url.slice(60, 110)); cdp.close(); process.exit(3); }
const raw = e => ev(e, tb.ctx);

// 关弹窗/抽屉
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  const p = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(我知道了|知道了)$/.test(n(e.innerText)));if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (p) { await mouse(p.x, p.y); await sleep(1200); }
}
await raw(`(()=>{const c=document.querySelector('[class*=catalog_drawer-close]');if(c)c.click();return 1;})()`).catch(() => {});
await sleep(1200);

// 找 UT 卡（img src 含 UT.png）
const card = await raw(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
 for(const c of cs){const img=c.querySelector('img');const s=img?decodeURIComponent(img.src||''):'';if(/UT/i.test(s)&&!/挑战/.test(s)){c.scrollIntoView({block:'center'});const b=c.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),status:c.getAttribute('data-lexical-node-status'),src:s.slice(-40)};}}
 return null;})()`).catch(() => null);
log("UT card", JSON.stringify(card));
if (!card) { log("NO UT CARD"); cdp.close(); process.exit(4); }
// 卡片在教材 iframe 内，顶层鼠标要加偏移
const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`, top.ctx).catch(() => ({ ox: 0, oy: 0 }));
log("iframe off", JSON.stringify(off));
await mouse(card.x + off.ox, card.y + off.oy);
await sleep(3500);

// 开始答题（跨帧找）
let started = false;
for (let k = 0; k < 8 && !started; k++) {
  for (const f of await frames()) {
    if (!f.ctx) continue;
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始答题|再次作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),t:n(e.innerText)};})()`, f.ctx).catch(() => null);
    if (p) {
      const oy = /pc\.html/.test(f.url) ? 0 : off.oy;
      await mouse(p.x, p.y + oy);
      log("clicked", p.t, "@", p.x, p.y + oy);
      started = true;
      break;
    }
  }
  if (!started) await sleep(2000);
}
if (!started) { log("NO START BUTTON"); cdp.close(); process.exit(5); }
await sleep(6000);

// 找考试帧
let ex = null, nq = 0;
for (let k = 0; k < 20; k++) {
  for (const f of await frames()) {
    if (!/testing\/diagnosis/.test(f.url) || !f.ctx) continue;
    const n = await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`, f.ctx).catch(() => 0);
    if (n >= 20) { ex = f; nq = n; break; }
  }
  if (ex) break;
  await sleep(2000);
}
log("exam frame", ex ? "found" : "NONE", "questions", nq);
if (!ex) { cdp.close(); process.exit(6); }

// 答满
const ans = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];let n=0;
 items.forEach(q=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
  if(rows.length){rows[0].click();n++;return;}
  const tfs=[...q.querySelectorAll('[class*=answer_optionTF]')];if(tfs.length){tfs[0].click();n++;return;}
  const el=q.querySelector('input,textarea');if(el){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
   Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'Agriculture and sustainable development');
   el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));n++;}});
 return n;})()`, ex.ctx).catch(e => String(e));
log("answered", ans);
await sleep(2500);

// JS 直接点考试帧里的提交（避开两层 iframe 坐标）
const sub = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25);if(!v.length)return 'nobtn';v[v.length-1].click();return 'clicked';})()`, ex.ctx).catch(e => String(e));
log("submit", sub);
await sleep(3500);

// 确认
for (let k = 0; k < 8; k++) {
  let hit = false;
  for (const f of await frames()) {
    const c = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('.ant-modal-confirm-btns .ant-btn-primary,button,div,span')].filter(e=>e.children.length<=1&&/^(确定|确认|确 定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.click();return 1;})()`, f.ctx).catch(() => 0);
    if (c) { hit = true; break; }
  }
  if (hit) { log("confirmed"); break; }
  await sleep(1500);
}
await sleep(6000);
// 成绩提交（若有）
for (let k = 0; k < 8; k++) {
  let posted = false;
  for (const f of await frames()) {
    const x = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>25);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
    if (x) { posted = true; break; }
  }
  if (posted) { log("成绩提交"); break; }
  await sleep(2000);
}
await sleep(4000);
for (const f of await frames()) {
  const t = await ev(`(()=>{const x=document.body.innerText.replace(/[ ]+/g,' ');const m=x.match(/(最终得分|测试满分|本次成绩提交成功|提交成功|成绩提交成功)[^。]{0,70}/);return m?m[0]:'';})()`, f.ctx).catch(() => "");
  if (t) log("RESULT", t);
}
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("ut" + U + "-result.png", Buffer.from(data, "base64"));
cdp.close();
