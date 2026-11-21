// challenge.mjs <unit> — 学科知识挑战：点卡片→开始挑战→5题→提交→成绩提交
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
const U = Number(process.argv[2] || 1);
const log = (...a) => console.log(`[cha${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER — run reenter first"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
let tb = null;
const refindTb = async (tries = 40) => {
  for (let k = 0; k < tries; k++) {
    tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
    if (tb) { const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0); if (n > 0) return true; }
    await sleep(1000);
  }
  return false;
};
if (!(await refindTb())) { log("NO TB"); process.exit(1); }
const dismissModals = async () => {
  for (let i = 0; i < 3; i++) {
    let hit = false;
    for (const f of await frames()) {
      const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
      if (p) { await mouse(p.x, p.y); await sleep(1000); hit = true; break; }
    }
    if (!hit) break;
  }
};
await dismissModals();

// 若指定单元：树切换
if (U) {
  // 开抽屉
  for (let i = 0; i < 4; i++) {
    const opened = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return 0;const b=e.getBoundingClientRect();return b.width>3?1:0;})()`, tb.ctx).catch(() => 0);
    if (opened) break;
    const op = await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(() => null);
    if (op) await mouse(op.x, op.y); else await mouse(22, 183);
    await sleep(2200);
  }
  await ev(`(()=>{const sc=document.querySelector('[class*=i-tree-menu_tree-menu]');if(sc)sc.scrollTop=0;return 1;})()`, tb.ctx).catch(() => {});
  await sleep(600);
  const up = await ev(`(()=>{const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>{const t=(e.innerText||'').replace(/\\s+/g,'');return t.startsWith('Unit${U}')||t.startsWith('Unit ${U}');});if(!el)return null;const b=el.getBoundingClientRect();if(b.top<0||b.top>window.innerHeight-30)return {out:1};return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(() => null);
  if (up && up.x) { await mouse(up.x, up.y); await sleep(6000); await dismissModals(); }
  else log("unit title not found, stay current");
  // 关抽屉
  for (let k = 0; k < 2; k++) {
    const dp = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(() => null);
    if (!dp) break;
    await mouse(dp.x, dp.y); await sleep(1000);
  }
  await refindTb(30);
}

// 找挑战卡片
const card = await ev(`(()=>{
  const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
  for(const c of cs){
    const img=c.querySelector('img');
    let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
    if(dec.includes('挑战')){
      c.scrollIntoView({block:'center'});
      const b=c.getBoundingClientRect();
      return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+40)};
    }
  }
  return null;})()`, tb.ctx).catch(() => null);
log("挑战卡片:", JSON.stringify(card));
if (!card) { log("本单元无挑战卡"); process.exit(2); }
await sleep(1200);
await mouse(card.x, card.y);
await sleep(4000);
await dismissModals();

// 自定义弹窗 → 开始挑战/再次挑战
const startBtn = async () => {
  for (const f of await frames()) {
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始挑战|再次挑战|开始答题)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (p) return p;
  }
  return null;
};
// 先等挑战帧（点卡片可能直接进）
let ex0 = null;
for (let k = 0; k < 8; k++) { await sleep(1000); ex0 = (await frames()).find(f => (f.url.includes("/testing/challenge/")||f.url.includes("/testing/diagnosis/")) && f.ctx); if (ex0) break; }
let sb = null;
if (!ex0) {
  sb = await startBtn();
  if (!sb) { await mouse(card.x, card.y); await sleep(3500); await dismissModals(); sb = await startBtn(); }
  log("开始挑战:", JSON.stringify(sb));
  if (!sb) { log("未出现开始挑战"); process.exit(3); }
  await mouse(sb.x, sb.y);
  await sleep(5000);
}
// 等挑战帧
let ex = null;
for (let k = 0; k < 25; k++) {
  await sleep(1000);
  ex = (await frames()).find(f => /testing\/(challenge|diagnosis)\/book/.test(f.url) && f.ctx);
  if (ex) break;
}
if (!ex) { log("挑战帧未出现"); process.exit(4); }
log("挑战帧:", ex.url.slice(50, 90));
let n = 0;
for (let k = 0; k < 15; k++) {
  n = await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`, ex.ctx).catch(() => 0);
  if (n > 0) break;
  await sleep(1000);
}
log("题数:", n);
// 作答：每大题点第一个选项（挑战选择题）
const ans = (keys) => ev(`(()=>{
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  const ks=${JSON.stringify(keys)};
  items.forEach((q,i)=>{
    const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
    if(rows.length){const key=ks[i];let row=null;
      if(key&&/^[A-H]$/.test(key))row=rows[key.charCodeAt(0)-65];
      if(!row)row=rows[0];
      if(row)row.click();return;}
    const el=q.querySelector('input,textarea');
    if(el){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'x');
      el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  });
  return items.length;})()`, ex.ctx);
await ans(null);
await sleep(1200);
// 提交（帧内 JS 点击）
const clickIn = async (txt) => ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)===${JSON.stringify(txt)}&&e.getBoundingClientRect().width>16);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, ex.ctx);
let subbed = await clickIn("提交");
log("提交:", subbed);
await sleep(3000);
// 确定弹窗（可能在挑战帧或父帧）
for (let k = 0; k < 6; k++) {
  let hit = false;
  for (const f of await frames()) {
    const r2 = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确定|确认)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
    if (r2) { hit = true; break; }
  }
  if (!hit) break;
  await sleep(2000);
}
await sleep(4000);
// 结果弹窗 → 成绩提交
let scored = false;
for (let k = 0; k < 8; k++) {
  let hit = false;
  for (const f of await frames()) {
    const r3 = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>16);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
    if (r3) { log("点成绩提交"); await sleep(2500); hit = true; scored = true; break; }
  }
  if (hit) break;
  // 看看是否出现"再次挑战"（说明已结束但没成绩提交按钮）
  const again = await startBtn();
  if (again) { log("结果页出现:", JSON.stringify(again)); break; }
  await sleep(1500);
}
// 读取弹窗文本
for (const f of await frames()) {
  const t = await ev(`(()=>{const d=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=popup]')].find(e=>e.getBoundingClientRect().height>80);return d?d.innerText.replace(/\\s+/g,' ').slice(0,300):'';})()`, f.ctx).catch(() => "");
  if (t && t.length > 20) log("弹窗:", t);
}
log("done scored=", scored);
cdp.close();
