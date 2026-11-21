// _u1g25_exec.mjs — 单节点执行：healthy → 打开精读模式 → 播完音频 → 关闭精读 → 截图 + DOM 证据
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u1g25]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));

const ID = "cEZVzYEIJFLxwce5"; // u1g25 externalNodeId = 精读题块
const SHOT = "shots/U1-u1g25.png";
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
const net = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/finishNode|course_progress|read|duration|record|complete|progress/i.test(u)) net.push({ url: u.slice(-120), post: (p.request.postData || "").slice(0, 400) });
});

// —— ① healthy 探针：非空题目块 > 0 且 chapter 匹配 ——
let healthy = false, probeLast = {};
for (let k = 0; k < 20 && !healthy; k++) {
  probeLast = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=document.getElementById(${JSON.stringify(ID)});
    return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
      richBlock:b?(b.innerText||'').length:0,hasOpen:b?[...b.querySelectorAll('*')].some(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式'):false};})()`).catch(() => ({}));
  const chapterOK = tb.url.includes(CH[1]);
  log(`probe#${k}: ${JSON.stringify(probeLast)} chapterOK=${chapterOK}`);
  if (probeLast.nonempty > 0 && chapterOK) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(2500);
}
if (!healthy) { log("NOT HEALTHY，终止"); cdp.close(); process.exit(3); }

// 点掉晚到规则弹窗
for (const f of await frames()) {
  if (!/pc\.html|textbook/.test(f.url)) continue;
  const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (q) { await mouse(q.x, q.y); log("点掉规则弹窗"); await sleep(1200); }
}
// 清遮罩（final2.mjs 配方）
await raw(`(()=>{const keep=()=>{for(const m of document.querySelectorAll('[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}
  for(const w of document.querySelectorAll('[class*=bottom-wrapper]'))w.style.display='block';};
  keep(); if(window.__kp)clearInterval(window.__kp); window.__kp=setInterval(keep,300); return 1;})()`).catch(() => 0);

// —— ② 目录逐节点点击 "Reading in detail" ——
const vp = await raw(`(()=>{
  const es=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];
  const e=es.filter(x=>(x.innerText||'').replace(/\\s+/g,' ').trim()==='Reading in detail')[0];
  if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
  return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
if (vp) { await mouse(vp.x, vp.y); log("目录点击 Reading in detail @", vp.x, vp.y); await sleep(4000); }

// —— ③ 深路由到完整链 u1/u1g22/u1g23/u1g25 ——
await cdp.send("Page.enable", {}, sessionId).catch(() => {});
await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/u1/u1g22/u1g23/u1g25` }, sessionId).catch(() => {});
log("深路由: u1/u1g22/u1g23/u1g25");
await sleep(8000);
let tb2 = null;
for (let k = 0; k < 20 && !tb2; k++) {
  tb2 = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[1].slice(0, 12)));
  if (!tb2) await sleep(1000);
}
const raw2 = tb2 ? (e) => ev(e, tb2.ctx) : raw;
// 点掉弹窗 + 清遮罩
for (const f of await frames()) {
  if (!/pc\.html|textbook/.test(f.url)) continue;
  const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (q) { await mouse(q.x, q.y); await sleep(1200); }
}
await raw2(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`).catch(() => 0);

// —— ④ 定位精读块，点「打开精读模式」（scrollIntoView 后取坐标） ——
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
const pill = await raw2(`(()=>{const b=document.getElementById(${JSON.stringify(ID)});
  if(!b)return {err:'no block'};
  b.scrollIntoView({block:'center'});
  const p=[...b.querySelectorAll('*')].find(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式');
  if(!p)return {err:'no pill',text:(b.innerText||'').replace(/\\s+/g,' ').slice(0,100)};
  p.scrollIntoView({block:'center'});const r=p.getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),blockLen:(b.innerText||'').length};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
log("打开精读模式按钮:", JSON.stringify(pill), "off:", JSON.stringify(off));
let opened = false;
if (pill && pill.x) {
  await sleep(1000);
  await mouse(pill.x + (off.ox || 0), pill.y + (off.oy || 0));
  log("点击打开精读模式 @", pill.x + (off.ox || 0), pill.y + (off.oy || 0));
  await sleep(5000);
  // 若规则弹窗晚到，点掉后重试
  for (let k = 0; k < 3; k++) {
    opened = await raw2(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false);
    if (opened) break;
    for (const f of await frames()) {
      const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
      if (q) { await mouse(q.x, q.y); await sleep(1200); }
    }
    await mouse(pill.x + (off.ox || 0), pill.y + (off.oy || 0));
    await sleep(4500);
  }
}
opened = await raw2(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false);
log("精读模式已打开:", opened);

// —— ⑤ 播完音频（2 倍速，最多等待 100s） ——
const act = await raw2(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>x.duration>0);
  if(!as.length)return 'no audio';const a=as[as.length-1];a.playbackRate=2;if(a.paused)a.play();return 'play '+Math.round(a.duration);})()`).catch(() => "err");
log("音频:", act);
let audioDone = false;
if (String(act).startsWith("play")) {
  for (let k = 0; k < 30; k++) {
    await sleep(3500);
    const s = await raw2(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>x.duration>0);const a=as[as.length-1];
      if(!a)return '{}';return JSON.stringify({t:Math.round(a.currentTime),d:Math.round(a.duration),e:a.ended,pr:a.playbackRate});})()`).catch(() => "{}");
    let j = {}; try { j = JSON.parse(s); } catch {}
    if (k % 4 === 3) log(`  音频进度:`, JSON.stringify(j));
    if (j.e || (j.d && j.t >= j.d - 1)) { audioDone = true; log("  ✓ 音频播完:", JSON.stringify(j)); break; }
  }
}
log("audioDone =", audioDone);
// 播完后慢滚精读正文（触发阅读上报）
const SCREENS = Number(process.env.SCREENS || 8);
for (let s = 0; s < SCREENS; s++) {
  await raw2(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.7));return 1;})()`).catch(() => {});
  await sleep(2200);
}
log("慢滚完成，相关上报:", net.length, JSON.stringify(net.slice(0, 10)).slice(0, 1400));

// —— ⑥ 关闭精读模式 ——
await raw2(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>(x.innerText||'').replace(/\\s+/g,'')==='关闭精读模式'&&x.getBoundingClientRect().width>20);if(e)e.click();return 1;})()`).catch(() => 0);
await sleep(2500);

// —— ⑦ DOM 证据 ——
const dom = await raw2(`(()=>{const b=document.getElementById(${JSON.stringify(ID)});
  const body=document.body.innerText||'';
  const t=b?(b.innerText||''):'';
  return {nodeId:${JSON.stringify(ID)},exists:!!b,len:t.length,
    head:t.replace(/\\s+/g,' ').slice(0,220),hasMilpa:/Milpa: The Maya/.test(t),
    hasOpenPill:/打开精读模式/.test(t),hasClosePill:/关闭精读模式/.test(body),
    bodyHasReading:/Reading in detail/.test(body)};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1200));

// —— ⑧ 截图 ——
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("截图失败");
fs.writeFileSync("_u1g25-exec.json", JSON.stringify({ healthy, probeLast, pill, opened, act, audioDone, net, dom, shot: SHOT }, null, 1));
cdp.close();
