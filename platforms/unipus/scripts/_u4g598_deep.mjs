// _u4g598_deep.mjs — 补充深度慢滚：确保展开 + 20 屏 3.5s + 目标块停留，触发阅读时长上报
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g598-deep]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));
const ID = "mUDW2AIDlwgTvp2K";
const SHOT = "shots/U4-u4g598.png";
const U = 4;
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[U]) { target = t.id; break; }
}
if (!target) { log("NO U4 READER"); process.exit(2); }
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
if (!tb) { log("NO TB"); cdp.close(); process.exit(2); }
const raw = (e) => ev(e, tb.ctx);
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const net = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/finishNode|course_progress|readingtime|studyRecord/i.test(u)) net.push({ url: u.slice(-110), post: (p.request.postData || "").slice(0, 350) });
});
// healthy 探针
let healthy = false, probeLast = {};
for (let k = 0; k < 12 && !healthy; k++) {
  probeLast = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const e=document.getElementById(${JSON.stringify(ID)});
    return {blocks:bs.length,nonempty:bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length,
      targetLen:e?(e.textContent||'').length:0};})()`).catch(() => ({}));
  if (tb.url.includes(CH[U]) && ((probeLast.nonempty || 0) > 0 || (probeLast.targetLen || 0) > 50)) { healthy = true; log("HEALTHY ✓", JSON.stringify(probeLast)); break; }
  await sleep(2000);
}
if (!healthy) { log("NOT HEALTHY"); cdp.close(); process.exit(3); }
// 点掉弹窗
for (const f of await frames()) {
  if (!/pc\.html|textbook/.test(f.url)) continue;
  const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (q) { await mouse(q.x, q.y); log("点掉规则弹窗"); await sleep(1200); }
}
// 确保展开（点击 + React + removeAttribute 兜底）
const ensureOpen = async (tag) => {
  const p = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});if(!e)return {err:'no'};
    e.scrollIntoView({block:'center'});const h=e.querySelector('[class*=collapsible-head]');const b=e.querySelector('[class*=collapsible-content]');
    const r=(h||e).getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),hidden:b?b.hasAttribute('hidden'):null};})()`).catch(() => ({}));
  if (p.hidden) { await sleep(700); await mouse(p.x, p.y); await sleep(1800); }
  let st = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const b=e?e.querySelector('[class*=collapsible-content]'):null;
    return {hidden:b?b.hasAttribute('hidden'):null,innerLen:b?(b.innerText||'').length:0};})()`).catch(() => ({}));
  if (st.hidden) {
    await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const h=e?e.querySelector('[class*=collapsible-head]'):null;
      if(h){const rk=Object.keys(h).find(k=>k.startsWith('__reactProps'));try{if(rk&&h[rk].onClick)h[rk].onClick({stopPropagation(){},preventDefault(){},target:h,currentTarget:h,nativeEvent:{}});else h.click();}catch(x){h.click();}}return 1;})()`).catch(() => 0);
    await sleep(1200);
    st = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const b=e?e.querySelector('[class*=collapsible-content]'):null;
      return {hidden:b?b.hasAttribute('hidden'):null,innerLen:b?(b.innerText||'').length:0};})()`).catch(() => ({}));
  }
  if (st.hidden) {
    await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const b=e?e.querySelector('[class*=collapsible-content]'):null;if(b)b.removeAttribute('hidden');return 1;})()`).catch(() => 0);
    await sleep(1000);
    st = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const b=e?e.querySelector('[class*=collapsible-content]'):null;
      return {hidden:b?b.hasAttribute('hidden'):null,innerLen:b?(b.innerText||'').length:0};})()`).catch(() => ({}));
  }
  log(`${tag}:`, JSON.stringify(st));
  return st;
};
await ensureOpen("深度慢滚前");
// 20 屏往返慢滚，每屏 3.5s，每 4 屏回目标块并停留
const SCREENS = Number(process.env.SCREENS || 20);
const STEP_MS = Number(process.env.STEP_MS || 3500);
for (let s = 0; s < SCREENS; s++) {
  const dir = s % 2 === 0 ? 1 : -1;
  await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,${dir}*Math.round(innerHeight*0.5));return 1;})()`).catch(() => {});
  await sleep(STEP_MS);
  if (s % 4 === 3) {
    await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});if(e)e.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
    await sleep(1500);
    await ensureOpen("保持展开");
    log(`  滚 ${s + 1}/${SCREENS} 屏, 相关上报=${net.length}`);
  }
}
// 目标块停留 10 秒（让阅读器累计时长）
await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});if(e)e.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
await sleep(10000);
log("深度慢滚完成，相关上报:", net.length, JSON.stringify(net.slice(0, 10)).slice(0, 1400));
// DOM 证据
const dom = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});
  const b=e?e.querySelector('[class*=collapsible-content]'):null;
  const t=b?(b.innerText||b.textContent||''):'';
  return {nodeId:${JSON.stringify(ID)},exists:!!e,hidden:b?b.hasAttribute('hidden'):null,
    contentLen:t.length,hasNewWords:/New words/.test(t),hasAgitation:/agitation/.test(t),
    text:t.replace(/\\s+/g,' ').slice(0,300)};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1200));
// 截图
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
fs.writeFileSync("_u4g598-deep.json", JSON.stringify({ healthy, probeLast, net, dom, shot: SHOT }, null, 1));
cdp.close();
