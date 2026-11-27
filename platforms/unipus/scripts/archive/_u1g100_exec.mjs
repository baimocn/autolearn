// _u1g100_exec.mjs — 单节点执行：healthy 探针 → 展开 u1g100 折叠块 → 目录逐节点点击 → 慢滚 → finishNode 监听 → 截图 + DOM 证据
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import { CDP } from "./cdp.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u1g100]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));

const ID = "lh5CBg2yWl61APog"; // u1g100 externalNodeId
const SHOT = "shots/U1-u1g100.png";

// —— 找 chapter 匹配 u1 的 reader 标签 ——
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
let target = null;
for (const t of (await getTabs()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url))) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[1]) { target = t.id; break; }
}
if (!target) { log("NO U1 READER"); process.exit(2); }
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[1].slice(0, 12)));
if (!tb) { log("NO TB"); cdp.close(); process.exit(2); }
const raw = (e) => ev(e, tb.ctx);
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};

// —— 监听网络：finishNode + 任何带 nodeId 的请求 ——
const fin = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/finishNode|progress|studyRecord|learning/i.test(u)) fin.push({ url: u.slice(-110), post: (p.request.postData || "").slice(0, 500) });
});

// —— ① healthy 探针：非空题目块 > 0 且 chapterId 匹配 ——
let healthy = false;
for (let k = 0; k < 20 && !healthy; k++) {
  const probe = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    return {blocks:bs.length, nonempty:bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length};})()`).catch(() => ({}));
  const chapterOK = tb.url.includes(CH[1]);
  log(`probe#${k}: ${JSON.stringify(probe)} chapterOK=${chapterOK}`);
  if (probe.nonempty > 0 && chapterOK) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(2500);
}
if (!healthy) { log("NOT HEALTHY，终止"); cdp.close(); process.exit(3); }

// —— ③ 目录逐节点点击 Vocabulary（点第 1 个 = Unit1）—— 让阅读器把当前节点标记为学习中 ——
const vp = await raw(`(()=>{
  const es=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];
  const e=es.filter(x=>(x.innerText||'').replace(/\\s+/g,' ').trim()==='Vocabulary')[0];
  if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
  return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
if (vp) { await mouse(vp.x, vp.y); log("目录点击 Vocabulary @", vp.x, vp.y); await sleep(3500); }
// 点掉晚到弹窗（CDP 真实鼠标，先 scrollIntoView）
for (const f of await frames()) {
  if (!/pc\.html|textbook/.test(f.url)) continue;
  const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (q) { await mouse(q.x, q.y); log("点掉规则弹窗"); await sleep(1200); }
}

// —— ② 定位并展开 u1g100 折叠块（先 scrollIntoView 再取坐标）——
// 定义可复用的"确保展开"函数：仅当 hidden 时点一次 <summary>
const ensureOpen = async (tag) => {
  const p = await raw(`(()=>{
    const c=document.getElementById(${JSON.stringify(ID)});
    if(!c)return {err:'no element'};
    c.scrollIntoView({block:'center'});
    const head=c.querySelector('[class*=collapsible-head]');
    const body=c.querySelector('[class*=collapsible-content]');
    const r=(head||c).getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2),
      hidden:body?body.hasAttribute('hidden'):null,
      textLen:body?(body.textContent||'').length:0};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
  if (p.hidden) {
    await sleep(900);
    await mouse(p.x, p.y);           // CDP 真实鼠标点 <summary>（toggle 到展开）
    log(`${tag}: 点击 summary 展开 @`, p.x, p.y);
    await sleep(2200);
  }
  const st = await raw(`(()=>{const c=document.getElementById(${JSON.stringify(ID)});const b=c.querySelector('[class*=collapsible-content]');
    return {hidden:b.hasAttribute('hidden'), innerLen:(b.innerText||'').length,
      hasNewWords:/New words/.test(b.innerText||'')};})()`).catch(() => ({}));
  log(`${tag} 状态:`, JSON.stringify(st));
  return st;
};
await ensureOpen("展开①");

// —— ④ 慢滚：以 u1g100 为中心上下往返慢滚，让阅读器持续感知该节点可见 ——
const sc0 = await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;return {top:Math.round(sc.scrollTop),h:Math.round(sc.scrollHeight),ch:Math.round(sc.clientHeight)};})()`).catch(() => ({}));
log("滚动容器:", JSON.stringify(sc0));
const SCREENS = Number(process.env.SCREENS || 14);
const STEP_MS = Number(process.env.STEP_MS || 2600);
for (let s = 0; s < SCREENS; s++) {
  // 偶数屏向下、奇数屏向上，围绕 u1g100 块慢滚（保持块在视口内）
  const dir = s % 2 === 0 ? 1 : -1;
  await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,${dir}*Math.round(innerHeight*0.45));return 1;})()`).catch(() => {});
  await sleep(STEP_MS);
  // 每 4 屏重新把 u1g100 居中（scrollIntoView 后再取坐标纪律）
  if (s % 4 === 3) {
    await raw(`(()=>{const c=document.getElementById(${JSON.stringify(ID)});if(c)c.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
    await sleep(900);
    await ensureOpen("慢滚中保持展开");
  }
  if (s % 4 === 3) log(`  滚 ${s + 1}/${SCREENS} 屏, finishNode=${fin.length}`);
}
log("慢滚完成，相关上报:", fin.length, JSON.stringify(fin).slice(0, 1200));

// —— ⑤ 界面 DOM 证据（截图前把视图定位到展开的 u1g100 块）——
await raw(`(()=>{const c=document.getElementById(${JSON.stringify(ID)});if(c)c.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
await sleep(800);
await ensureOpen("截图前确认展开");
const dom = await raw(`(()=>{
  const c=document.getElementById(${JSON.stringify(ID)});
  const b=c?c.querySelector('[class*=collapsible-content]'):null;
  const t=b?(b.innerText||b.textContent||''):'';
  const body=document.body.innerText;
  return {nodeId:${JSON.stringify(ID)}, hidden:b?b.hasAttribute('hidden'):null,
    contentLen:t.length, hasNewWords:/New words/.test(t), hasBounty:/bounty/.test(t),
    snippet:t.replace(/\\s+/g,' ').slice(0,300),
    bodyHasVocab:/词汇表/.test(body), bodyTail:body.replace(/\\s+/g,' ').slice(-260)};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1200));

// —— ⑥ 截图（Page.captureScreenshot） ——
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("截图失败");

fs.writeFileSync("_u1g100-exec.json", JSON.stringify({ healthy, fin, dom, shot: SHOT }, null, 1));
cdp.close();
