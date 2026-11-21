// _u1g222_exec.mjs — 单节点执行：healthy → 目录点击 Writing strategies → 定位 u1g222 段落 → 往返慢滚 → finishNode 监听 → 截图 + DOM 证据
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u1g222]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));

const ID = "xDJw7yhqqvcSYlpx"; // u1g222 externalNodeId
const SHOT = "shots/U1-u1g222.png";
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
let target = null;
for (const t of (await getTabs()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url))) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb0 = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[1]) { target = t.id; break; }
}
if (!target) { log("NO U1 READER"); process.exit(2); }
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl0 = await frames();
const tb = fl0.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[1].slice(0, 12)));
if (!tb) { log("NO TB"); cdp.close(); process.exit(2); }
const raw = (e) => ev(e, tb.ctx);
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
// 网络监听
const fin = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/finishNode|course_progress|studyRecord/i.test(u)) fin.push({ url: u.slice(-110), post: (p.request.postData || "").slice(0, 400) });
});

// —— ① healthy 探针：非空题目块 > 0 且 chapterId 匹配 ——
let healthy = false, probeLast = {};
for (let k = 0; k < 20 && !healthy; k++) {
  probeLast = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    return {blocks:bs.length,nonempty:bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length};})()`).catch(() => ({}));
  const chapterOK = tb.url.includes(CH[1]);
  log(`probe#${k}: ${JSON.stringify(probeLast)} chapterOK=${chapterOK}`);
  if (probeLast.nonempty > 0 && chapterOK) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(2500);
}
if (!healthy) { log("NOT HEALTHY，终止"); cdp.close(); process.exit(3); }

// 点掉晚到弹窗
for (const f of await frames()) {
  if (!/pc\.html|textbook/.test(f.url)) continue;
  const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (q) { await mouse(q.x, q.y); log("点掉规则弹窗"); await sleep(1200); }
}

// —— ② 目录逐节点点击 "Writing strategies"（第 1 个 = Unit1）——
const vp = await raw(`(()=>{
  const es=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];
  const e=es.filter(x=>(x.innerText||'').replace(/\\s+/g,' ').trim()==='Writing strategies')[0];
  if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
  return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
if (vp) { await mouse(vp.x, vp.y); log("目录点击 Writing strategies @", vp.x, vp.y); await sleep(4000); }

// —— ③ 深路由到完整链 u1/u1g22/u1g149/u1g150/u1g222 ——
await cdp.send("Page.enable", {}, sessionId).catch(() => {});
await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/u1/u1g22/u1g149/u1g150/u1g222` }, sessionId).catch(() => {});
log("深路由: u1/u1g22/u1g149/u1g150/u1g222");
await sleep(7000);
// 重新找 tb（导航后 ctx 可能更新）
let tb2 = null;
for (let k = 0; k < 20 && !tb2; k++) {
  tb2 = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[1].slice(0, 12)));
  if (!tb2) await sleep(1000);
}
const raw2 = tb2 ? (e) => ev(e, tb2.ctx) : raw;
// 点掉弹窗
for (const f of await frames()) {
  if (!/pc\.html|textbook/.test(f.url)) continue;
  const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (q) { await mouse(q.x, q.y); await sleep(1200); }
}

// —— ④ 定位 u1g222 段落并以它为中心往返慢滚 ——
const loc = await raw2(`(()=>{const p=document.getElementById(${JSON.stringify(ID)});if(!p)return {err:'no elem'};
  p.scrollIntoView({block:'center'});
  const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
  return {top:Math.round(p.getBoundingClientRect().top),len:(p.innerText||'').length,
    text:(p.innerText||'').replace(/\\s+/g,' ').slice(0,140),scTop:Math.round(sc.scrollTop),scH:Math.round(sc.scrollHeight)};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
log("目标段落:", JSON.stringify(loc));
await sleep(1500);
const SCREENS = Number(process.env.SCREENS || 14);
const STEP_MS = Number(process.env.STEP_MS || 2600);
for (let s = 0; s < SCREENS; s++) {
  const dir = s % 2 === 0 ? 1 : -1;
  await raw2(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,${dir}*Math.round(innerHeight*0.45));return 1;})()`).catch(() => {});
  await sleep(STEP_MS);
  if (s % 4 === 3) {
    await raw2(`(()=>{const p=document.getElementById(${JSON.stringify(ID)});if(p)p.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
    await sleep(900);
    log(`  滚 ${s + 1}/${SCREENS} 屏, 相关上报=${fin.length}`);
  }
}
log("慢滚完成，相关上报:", fin.length, JSON.stringify(fin).slice(0, 1400));

// —— ⑤ DOM 证据（截图前把视图定位到目标段落）——
await raw2(`(()=>{const p=document.getElementById(${JSON.stringify(ID)});if(p)p.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
await sleep(1000);
const dom = await raw2(`(()=>{
  const p=document.getElementById(${JSON.stringify(ID)});
  const body=document.body.innerText||'';
  const t=p?(p.innerText||''):'';
  return {nodeId:${JSON.stringify(ID)}, exists:!!p, tag:p?p.tagName:null,
    len:t.length, text:t.replace(/\\s+/g,' ').slice(0,260),
    hasPractice:/For a practice or phenomenon/.test(t),
    bodyHasWriting:/Writing strategies/.test(body),
    bodyTail:body.replace(/\\s+/g,' ').slice(-180)};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1200));

// —— ⑥ 截图 ——
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("截图失败");
fs.writeFileSync("_u1g222-exec.json", JSON.stringify({ healthy, probeLast, loc, fin, dom, shot: SHOT }, null, 1));
cdp.close();
