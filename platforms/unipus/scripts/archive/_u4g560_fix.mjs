// _u4g560_fix.mjs — 关两层弹窗 → 触发水合 → 校验 healthy（不跳过 healthy 纪律）
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[fix]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const ID = "oMrcWJawhYiLWVMS";
const U = 4;
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb0 = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[U]) { target = t.id; break; }
}
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const tbF = () => frames().then(fl => fl.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12))));
const raw = (e, f) => ev(e, f.ctx);
const st = async () => { const f = await tbF(); if (!f) return { err: "no tb" }; return await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const b=document.getElementById(${JSON.stringify(ID)});
  return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
    targetLen:b?(b.innerText||'').length:0,status:b?b.getAttribute('data-lexical-node-status'):null,
    unitTest:/考前须知/.test(document.body.innerText),topTimeout:false};})()`, f).catch(() => ({})); };
log("初始:", JSON.stringify(await st()));
// 关顶层「确定」超时弹窗
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
    const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^确定$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);
    if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);return{x,y,hit:document.elementFromPoint(x,y)?.tagName};})()`, f.ctx).catch(() => null);
  if (q && q.hit === "BUTTON") { await mouse(q.x, q.y); log("关顶层超时弹窗", JSON.stringify(q)); await sleep(1500); }
}
// 关 textbook 帧 Unit test 弹窗（✕）
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|textbook/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
for (let k = 0; k < 4; k++) {
  const f = await tbF(); if (!f) { await sleep(2000); continue; }
  const q = await raw(`(()=>{if(!/考前须知/.test(document.body.innerText))return{gone:true};
    const v=[...document.querySelectorAll('button,div,span,a,i')].filter(e=>/acknowledge_closeBtn/.test((e.className||'').toString())&&e.getBoundingClientRect().width>8);
    if(!v.length)return{err:'no btn'};const e=v[0];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);const at=document.elementFromPoint(x,y);
    return{x,y,hit:at?at.tagName:null};})()`, f).catch(e => ({ err: String(e).slice(0, 100) }));
  log(`关UT#${k}:`, JSON.stringify(q), "off", JSON.stringify(off));
  if (q && q.gone) break;
  if (q && Number.isFinite(q.x)) { await mouse(q.x + (off.ox || 0), q.y + (off.oy || 0)); await sleep(1800); }
}
// 清遮罩
for (const f of await frames()) {
  await ev(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop],[class*=modalOverlay]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`, f.ctx).catch(() => 0);
}
// 触发水合：滚动 + 点击目标块 + 目录点击
let healthy = false, last = {};
for (let k = 0; k < 16 && !healthy; k++) {
  const f = await tbF(); if (!f) { await sleep(2500); continue; }
  const p = await raw(`(()=>{const b=document.getElementById(${JSON.stringify(ID)});if(!b)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);const at=document.elementFromPoint(x,y);
    return{x,y,hit:at?(at.tagName+'.'+(at.className||'').toString().slice(0,35)):null};})()`, f).catch(() => null);
  if (p) { await mouse(p.x + (off.ox || 0), p.y + (off.oy || 0)); log(`水合#${k} 点击目标块`, JSON.stringify(p)); }
  const cat = await raw(`(()=>{const es=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].filter(x=>/Reading.*detail/i.test((x.innerText||'').replace(/\\s+/g,' ')));
    const e=es[1];if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`, f).catch(() => null);
  if (cat) { await mouse(cat.x + (off.ox || 0), cat.y + (off.oy || 0)); log(`水合#${k} 目录点击`, JSON.stringify(cat)); }
  await sleep(3000);
  last = await st();
  log(`#${k}:`, JSON.stringify(last));
  if ((last.nonempty || 0) > 0) { healthy = true; log("HEALTHY ✓"); }
}
fs.mkdirSync("shots", { recursive: true });
const s = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (s.data) { fs.writeFileSync("shots/U4-u4g560-fix.png", Buffer.from(s.data, "base64")); log("截图:", fs.statSync("shots/U4-u4g560-fix.png").size); }
fs.writeFileSync("_u4g560-fix.json", JSON.stringify({ healthy, last, off }, null, 1));
log("RESULT healthy =", healthy);
cdp.close();
process.exit(healthy ? 0 : 1);
