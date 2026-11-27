// _u1g104_exec.mjs — 单节点执行：healthy → 目录点击 Unit test → 点 UT 卡片 → 成绩页 → 慢滚/上报 → 截图 + DOM 证据
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u1g104]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));

const CARD = "GRiPoOlSWATCKSis"; // UT.png 卡片 = Unit test 1 (u1g104)
const SHOT = "shots/U1-u1g104.png";
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();

// —— 找 chapter 匹配 u1 的 reader ——
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
// iframe 顶部偏移（供 exam 内坐标叠加用）
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
log("iframe off:", JSON.stringify(off));

// —— 网络监听 ——
const fin = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/finishNode|course_progress|submit|score|result|record/i.test(u)) fin.push({ url: u.slice(-120), post: (p.request.postData || "").slice(0, 400) });
});

// —— ① healthy 探针 ——
let healthy = false, probeLast = {};
for (let k = 0; k < 20 && !healthy; k++) {
  probeLast = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    return {blocks:bs.length, nonempty:bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length};})()`).catch(() => ({}));
  const chapterOK = tb.url.includes(CH[1]);
  log(`probe#${k}: ${JSON.stringify(probeLast)} chapterOK=${chapterOK}`);
  if (probeLast.nonempty > 0 && chapterOK) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(2500);
}
if (!healthy) { log("NOT HEALTHY，终止"); cdp.close(); process.exit(3); }

// 点掉晚到规则弹窗（CDP 真鼠标，先 scrollIntoView）
const dismiss = async () => {
  for (const f of await frames()) {
    if (!/pc\.html|textbook/.test(f.url)) continue;
    const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (q) { await mouse(q.x, q.y); log("点掉规则弹窗"); await sleep(1200); }
  }
};
await dismiss();

// —— ② 目录逐节点点击 "Unit test"（第 1 个 = Unit1）——
const catalogClick = async (label) => {
  const p = await raw(`(()=>{
    const es=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];
    const e=es.filter(x=>(x.innerText||'').replace(/\\s+/g,' ').trim()===${JSON.stringify(label)})[0];
    if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
    return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
  if (!p) { log(`目录项「${label}」未找到`); return false; }
  await mouse(p.x, p.y); log(`目录点击「${label}」@`, p.x, p.y); await sleep(4500);
  await dismiss();
  return true;
};
await catalogClick("Unit test");

// —— ③ 定位并点击 UT 卡片（先 scrollIntoView 再取坐标）——
const cardClick = async (tag) => {
  const p = await raw(`(()=>{
    const c=document.getElementById(${JSON.stringify(CARD)});if(!c)return {err:'no card'};
    c.scrollIntoView({block:'center'});
    const b=c.getBoundingClientRect();
    return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2),
      status:c.getAttribute('data-lexical-node-status'), top:Math.round(b.top)};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
  log(`${tag} 卡片:`, JSON.stringify(p));
  if (p && p.x) { await sleep(800); await mouse(p.x, p.y + (off.oy || 0)); log(`${tag}: 点击卡片 @`, p.x, p.y + (off.oy || 0)); }
  return p;
};
await cardClick("①");
await sleep(4000);
await dismiss();

// 等 exam 帧出现（最多 20s）
let exam = null;
for (let k = 0; k < 20 && !exam; k++) {
  exam = (await frames()).find(f => /testing\/(diagnosis|challenge)\/book/.test(f.url) && f.ctx);
  if (!exam) await sleep(1000);
}
log("exam 帧:", exam ? exam.url.slice(-90) : "无");

// —— ④ 读取成绩页/答题态文本（DOM 证据）——
let examText = "";
if (exam) {
  examText = String(await ev(`document.body.innerText`, exam.ctx).catch(() => "") || "");
  log("exam 文本(前 320):", examText.replace(/\s+/g, " ").slice(0, 320));
} else {
  // 可能在页内弹窗而非独立 exam 帧：从各 frame 找"最终得分/再次作答"
  for (const f of await frames()) {
    const t = String(await ev(`document.body.innerText`, f.ctx).catch(() => "") || "");
    if (/最终得分|正确率|再次作答|开始答题/.test(t)) { examText = t; log("页内成绩文本(前 320):", t.replace(/\s+/g, " ").slice(0, 320)); break; }
  }
}
// 若出现"开始答题/再次作答"，点它进入成绩/答题页
for (let k = 0; k < 3; k++) {
  const btn = await (async () => {
    for (const f of await frames()) {
      const oy = /textbook/.test(f.url) ? (off.oy || 0) : 0;
      const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始答题|再次作答|查看测试结果)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy}),t:n(e.innerText)};})()`, f.ctx).catch(() => null);
      if (r) return r;
    }
    return null;
  })();
  if (!btn) break;
  log("点击按钮:", JSON.stringify(btn));
  await mouse(btn.x, btn.y);
  await sleep(4000);
  await dismiss();
}
// 再读成绩文本
for (const f of await frames()) {
  const t = String(await ev(`document.body.innerText`, f.ctx).catch(() => "") || "");
  if (/最终得分|正确率/.test(t)) { examText = t; break; }
}
const scoreMatch = examText.replace(/\s+/g, " ").match(/最终得分是\s*([\d.]+)\s*分/);
log("解析得分:", scoreMatch ? scoreMatch[1] : "未匹配到");

// —— ⑤ 慢滚目录链节点（u1/u1g103/u1g104）触发阅读器上报 ——
// 深路由导航到目标链，再围绕 UT 卡片慢滚
await cdp.send("Page.enable", {}, sessionId).catch(() => {});
await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/u1/u1g103/u1g104` }, sessionId).catch(() => {});
log("深路由: u1/u1g103/u1g104");
await sleep(7000);
await dismiss();
// 重新找 tb（导航后 ctx 可能更新）
let tb2 = null;
for (let k = 0; k < 20 && !tb2; k++) {
  tb2 = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[1].slice(0, 12)));
  if (!tb2) await sleep(1000);
}
const raw2 = tb2 ? (e) => ev(e, tb2.ctx) : raw;
if (tb2) {
  await raw2(`(()=>{const c=document.getElementById(${JSON.stringify(CARD)});if(c)c.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
  await sleep(1500);
  const SCREENS = Number(process.env.SCREENS || 12);
  const STEP_MS = Number(process.env.STEP_MS || 2600);
  for (let s = 0; s < SCREENS; s++) {
    const dir = s % 2 === 0 ? 1 : -1;
    await raw2(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,${dir}*Math.round(innerHeight*0.45));return 1;})()`).catch(() => {});
    await sleep(STEP_MS);
    if (s % 4 === 3) {
      await raw2(`(()=>{const c=document.getElementById(${JSON.stringify(CARD)});if(c)c.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
      await sleep(900);
      log(`  滚 ${s + 1}/${SCREENS} 屏, 相关上报=${fin.length}`);
    }
  }
}
log("慢滚完成，相关上报:", fin.length, JSON.stringify(fin).slice(0, 1600));

// —— ⑥ 界面 DOM 证据 ——
const dom = await raw2(`(()=>{
  const c=document.getElementById(${JSON.stringify(CARD)});
  const body=document.body.innerText||'';
  return {cardId:${JSON.stringify(CARD)}, cardExists:!!c,
    cardStatus:c?c.getAttribute('data-lexical-node-status'):null,
    hash:location.hash.slice(-50),
    bodyHasUT:/Unit test/i.test(body),
    bodyTail:body.replace(/\\s+/g,' ').slice(-200)};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1000));

// —— ⑦ 截图 ——
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("截图失败");

fs.writeFileSync("_u1g104-exec.json", JSON.stringify({ healthy, probeLast, score: scoreMatch ? scoreMatch[1] : null, examTextHead: examText.replace(/\s+/g, " ").slice(0, 500), fin, dom, shot: SHOT }, null, 1));
cdp.close();
