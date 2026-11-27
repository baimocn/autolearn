// _u4g560_recover.mjs — 冷却后恢复：新建干净标签深路由 u4g560 链 + 点击挂载 + 精读流程 + 截图
import { connect } from "./utlib.mjs";
import { CDP } from "./cdp.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g560]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));
const ID = "oMrcWJawhYiLWVMS";
const SHOT = "shots/U4-u4g560.png";
const U = 4;
const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const boot = await CDP.connect(ver.webSocketDebuggerUrl);
// 关掉 u4 卡死标签（保留 u6 对照）
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
for (const t of tabs.filter(x => x.type === "page" && /ucontent\.unipus\.cn/.test(x.url))) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[U]) { await boot.send("Target.closeTarget", { targetId: t.id }).catch(() => {}); log("关闭 u4 旧标签", t.id); }
}
await sleep(1200);
const r = await boot.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u4/u4g558/u4g559/u4g560` });
boot.close();
log("新标签:", r.targetId);
await sleep(16000);
const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const net = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/answer\/list|finishNode|course_progress|question|readingtime/i.test(u)) net.push({ url: u.slice(-130), post: (p.request.postData || "").slice(0, 350) });
});
let tb = null, st = {};
for (let k = 0; k < 25; k++) {
  tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
  if (tb) {
    st = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
      const b=document.getElementById(${JSON.stringify(ID)});
      return {blocks:bs.length,textNonempty:bs.filter(x=>(x.textContent||'').replace(/\\s+/g,'').length>5).length,
        innerNonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
        targetLen:b?(b.innerText||b.textContent||'').length:0,
        targetStatus:b?b.getAttribute('data-lexical-node-status'):null,
        targetHasOpen:b?[...b.querySelectorAll('*')].some(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式'):false};})()`, tb.ctx).catch(() => ({}));
    log(`wait#${k}:`, JSON.stringify(st));
    if ((st.textNonempty || 0) > 15 || st.targetHasOpen) break;
  }
  await sleep(2500);
}
if (!tb) { log("NO TB"); cdp.close(); process.exit(2); }
const raw = (e) => ev(e, tb.ctx);
// 点掉规则弹窗
const dismiss = async () => {
  for (const f of await frames()) {
    if (!/pc\.html|textbook/.test(f.url)) continue;
    const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (q) { await mouse(q.x, q.y); log("点掉规则弹窗"); await sleep(1200); }
  }
};
await dismiss();
// 目录点击第2个 Reading in detail（Discovering China 下的）
const cat = await raw(`(()=>{const es=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].filter(x=>/Reading.*detail/i.test((x.innerText||'').replace(/\\s+/g,' ')));
  const e=es[1];if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
  return {n:es.length,x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
if (cat) { await mouse(cat.x, cat.y); log("目录点击 Reading in detail #2 @", JSON.stringify(cat)); await sleep(4500); await dismiss(); }
// 逐块滚动 + 反复点击目标块触发挂载
let mounted = false;
for (let k = 0; k < 12 && !mounted; k++) {
  const p = await raw(`(()=>{const b=document.getElementById(${JSON.stringify(ID)});
    if(!b)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();
    const t=b.innerText||b.textContent||'';
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),len:t.length,
      status:b.getAttribute('data-lexical-node-status'),
      hasOpen:[...b.querySelectorAll('*')].some(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式'),
      head:t.replace(/\\s+/g,' ').slice(0,90)};})()`).catch(() => null);
  log(`mount#${k}:`, JSON.stringify(p));
  if (p && p.hasOpen && p.len > 100) { mounted = true; break; }
  if (p) { await sleep(700); await mouse(p.x, p.y); await sleep(3000); }
}
const targetReq = net.filter(x => new RegExp(ID).test(x.url));
log("u4g560 answer/list 请求数:", targetReq.length, " mounted =", mounted);
// —— healthy 探针（chapter 匹配 + 目标块已水合 或 非空题目块）——
const healthy = tb.url.includes(CH[U]) && (mounted || (st.innerNonempty || 0) > 0);
log("HEALTHY:", healthy, JSON.stringify(st));
// 若已挂载，走精读流程
let opened = false, au = null, audioSt = null;
if (mounted) {
  const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
  const pill = await raw(`(()=>{const b=document.getElementById(${JSON.stringify(ID)});
    if(!b)return null;b.scrollIntoView({block:'center'});
    const p=[...b.querySelectorAll('*')].find(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式');
    if(!p)return null;p.scrollIntoView({block:'center'});const r=p.getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`).catch(() => null);
  if (pill) { await sleep(800); await mouse(pill.x + (off.ox || 0), pill.y + (off.oy || 0)); await sleep(5500); await dismiss(); opened = await raw(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false); log("精读打开:", opened); }
  au = await raw(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>isFinite(x.duration)&&x.duration>0);
    if(!as.length)return {err:'no audio',n:document.querySelectorAll('audio').length};
    const a=as[as.length-1];const d=a.duration;a.pause();a.playbackRate=16;a.muted=true;
    a.currentTime=Math.max(0,d-1.2);try{a.play().catch(()=>{});}catch(e){}
    a.dispatchEvent(new Event('timeupdate'));return {n:as.length,d:Math.round(d),t:Math.round(a.currentTime)};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
  log("音频拖尾:", JSON.stringify(au));
  await sleep(5000);
  audioSt = await raw(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>isFinite(x.duration)&&x.duration>0);
    const a=as[as.length-1];if(!a)return '{}';a.currentTime=a.duration;
    a.dispatchEvent(new Event('timeupdate'));a.dispatchEvent(new Event('ended'));
    return JSON.stringify({t:Math.round(a.currentTime),d:Math.round(a.duration),ended:a.ended});})()`).catch(() => "{}");
  log("音频状态:", audioSt);
  await sleep(7000);
  for (let k = 0; k < 4; k++) {
    await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.6));return 1;})()`).catch(() => {});
    await sleep(2600);
  }
  await raw(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>(x.innerText||'').replace(/\\s+/g,'')==='关闭精读模式'&&x.getBoundingClientRect().width>20);if(e)e.click();return 1;})()`).catch(() => 0);
}
const hitFin = net.filter(x => /finishNode/.test(x.url) && new RegExp(ID).test(x.post));
log("命中 u4g560 finishNode:", hitFin.length, " 相关上报:", net.length);
// DOM 证据
const dom = await raw(`(()=>{const b=document.getElementById(${JSON.stringify(ID)});const t=b?(b.innerText||b.textContent||''):'';
  return {nodeId:${JSON.stringify(ID)},exists:!!b,len:t.length,status:b?b.getAttribute('data-lexical-node-status'):null,
    head:t.replace(/\\s+/g,' ').slice(0,220),hasOpenPill:/打开精读模式/.test(t)};})()`).catch(() => ({}));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 900));
// 截图
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
fs.writeFileSync("_u4g560-exec.json", JSON.stringify({ healthy, st, mounted, targetReqCount: targetReq.length, opened, au, audioSt, hitFin, dom, net, shot: SHOT }, null, 1));
cdp.close();
