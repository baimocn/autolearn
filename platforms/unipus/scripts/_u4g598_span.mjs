// _u4g598_span.mjs — 测量 u4g598 折叠块在滚动容器中的绝对范围，并从顶到底完整滚过（每屏 3s）
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g598-span]", ...a);
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
const net = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/finishNode|course_progress|readingtime/i.test(u)) net.push({ url: u.slice(-100), post: (p.request.postData || "").slice(0, 300) });
});
// healthy
let ok = false;
for (let k = 0; k < 10 && !ok; k++) {
  const p = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});return {len:e?(e.textContent||'').length:0};})()`).catch(() => ({}));
  if ((p.len || 0) > 50 && tb.url.includes(CH[U])) { ok = true; log("HEALTHY ✓", JSON.stringify(p)); break; }
  await sleep(2000);
}
if (!ok) { log("NOT HEALTHY"); cdp.close(); process.exit(3); }
// 确保展开 + 测量范围
const span = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});if(!e)return {err:'no'};
  const b=e.querySelector('[class*=collapsible-content]');if(b&&b.hasAttribute('hidden'))b.removeAttribute('hidden');
  const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
  const sr=sc.getBoundingClientRect(), er=e.getBoundingClientRect();
  const topAbs=Math.round(er.top - sr.top + sc.scrollTop);
  const h=Math.round(er.height);
  return {topAbs, h, scTop:Math.round(sc.scrollTop), scH:Math.round(sc.scrollHeight), clientH:Math.round(sc.clientHeight),
    hidden:b?b.hasAttribute('hidden'):null, contentLen:b?(b.textContent||'').length:0};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
log("折叠块范围:", JSON.stringify(span));
// 从块顶部上方一屏开始，逐屏滚到块底部下方一屏
const vh = span.clientH || 610;
const start = Math.max(0, (span.topAbs || 0) - Math.round(vh * 0.6));
const end = Math.min(span.scH || 99999, (span.topAbs || 0) + (span.h || 0) + Math.round(vh * 0.6));
log(`滚动范围: ${start} → ${end} (块 topAbs=${span.topAbs}, h=${span.h})`);
let y = start;
let screens = 0;
while (y <= end && screens < 40) {
  await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=${y};return 1;})()`).catch(() => 0);
  await sleep(3000);
  screens++;
  if (screens % 5 === 0) log(`  y=${y} (${screens}), 上报=${net.length}`);
  y += Math.round(vh * 0.7);
}
log(`完整滚过 ${screens} 屏，相关上报:`, net.length);
// 回目标块停留 15s
await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});if(e)e.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
await sleep(15000);
log("停留完成，上报:", net.length, JSON.stringify(net.slice(-6)).slice(0, 1000));
// DOM + 截图
const dom = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const b=e?e.querySelector('[class*=collapsible-content]'):null;
  const t=b?(b.innerText||b.textContent||''):'';
  return {nodeId:${JSON.stringify(ID)},exists:!!e,hidden:b?b.hasAttribute('hidden'):null,
    contentLen:t.length,hasNewWords:/New words/.test(t),hasAgitation:/agitation/.test(t),
    text:t.replace(/\\s+/g,' ').slice(0,280)};})()`).catch(() => ({}));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1100));
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
fs.writeFileSync("_u4g598-span.json", JSON.stringify({ span, net, dom, shot: SHOT }, null, 1));
cdp.close();
