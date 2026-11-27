// _u4g560_exec.mjs — 单节点 u4g560 (rich_text_read) 执行：
//  关超时弹窗 → healthy 探针 → 打开精读模式 → 音频拖尾/ended → 慢滚 → finishNode 监听
//  → 截图 → 直接调 course_progress API 核验 state.pass
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g560]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const ID = "oMrcWJawhYiLWVMS";
const U = 4;
const SHOT = "shots/U4-u4g560.png";
const E = JSON.stringify(ID);
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
const tabs = (await getTabs()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb0 = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[U]) { target = t.id; break; }
}
if (!target) { log("NO U4 READER，终止"); process.exit(2); }
log("reader:", target);
const L = await connect(target);
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
  if (/finishNode|course_progress|readingtime|answer\/list/i.test(u)) net.push({ url: u.slice(-130), post: (p.request.postData || "").slice(0, 400) });
});
const fl0 = await frames();
const tb = fl0.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
if (!tb) { log("NO TB，终止"); cdp.close(); process.exit(2); }
const raw = (e) => ev(e, tb.ctx);
const Q = (body) => `(()=>{const id=${E};${body}})()`;

// —— ① healthy 探针（硬纪律②：非空题目块>0 且 chapterId 匹配 CH[U]）——
let healthy = false, probe = {};
for (let k = 0; k < 20 && !healthy; k++) {
  probe = await raw(Q(`const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length};`)).catch(() => ({}));
  const chapterOK = tb.url.includes(CH[U]);
  log(`probe#${k}: ${JSON.stringify(probe)} chapterOK=${chapterOK}`);
  if (chapterOK && (probe.nonempty || 0) > 0) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(2500);
}
if (!healthy) { log("NOT HEALTHY，不盲刷，终止"); fs.writeFileSync("_u4g560-exec.json", JSON.stringify({ healthy, probe, net, shot: SHOT }, null, 1)); cdp.close(); process.exit(3); }

// —— ② 关闭「长时间未操作」超时弹窗（在顶层 pc.html 帧，坐标 640,428 由截图+elementFromPoint 确认）——
const dismissTimeout = async () => {
  for (const f of await frames()) {
    if (!/pc\.html|textbook/.test(f.url)) continue;
    const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^确定$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);
      if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
      const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);const at=document.elementFromPoint(x,y);
      return {x,y,hit:at?at.tagName:null,text:n(e.innerText)};})()`, f.ctx).catch(() => null);
    if (q && q.hit === "BUTTON") { await mouse(q.x, q.y); log("关闭超时弹窗 @", JSON.stringify(q)); await sleep(1500); return true; }
  }
  return false;
};
await dismissTimeout();
// 再清遮罩 + 规则弹窗
await raw(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`).catch(() => 0);
for (const f of await frames()) {
  if (!/pc\.html|textbook/.test(f.url)) continue;
  const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`, f.ctx).catch(() => null);
  if (q) { await mouse(q.x, q.y); log("点掉规则弹窗"); await sleep(1200); }
}

// —— ③ 点前截图（视觉优先：看画面确认弹窗已消失）——
fs.mkdirSync("shots", { recursive: true });
const shotPre = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shotPre.data) { fs.writeFileSync("shots/U4-u4g560-pre.png", Buffer.from(shotPre.data, "base64")); log("点击前截图:", fs.statSync("shots/U4-u4g560-pre.png").size, "bytes"); }

// —— ④ 定位并点击「打开精读模式」（scrollIntoView + elementFromPoint 校验）——
const iframeOff = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|textbook/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
let opened = await raw(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false);
let pill = null;
if (!opened) {
  pill = await raw(Q(`const b=document.getElementById(id);
    if(!b)return {err:'no elem'};
    b.scrollIntoView({block:'center'});
    const p=[...b.querySelectorAll('*')].find(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式'&&e.getBoundingClientRect().width>10);
    if(!p)return {err:'no pill'};
    p.scrollIntoView({block:'center'});const r=p.getBoundingClientRect();
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);
    const at=document.elementFromPoint(x,y);
    return {x,y,w:Math.round(r.width),h:Math.round(r.height),hit:at?at.tagName:null,
      hitText:at?(at.innerText||'').replace(/\\s+/g,'').slice(0,30):''};`)).catch(e => ({ err: String(e).slice(0, 150) }));
  log("打开精读按钮(frame内坐标):", JSON.stringify(pill), " iframe偏移:", JSON.stringify(iframeOff));
  if (pill && !pill.err && Number.isFinite(pill.x)) {
    await sleep(900);
    await mouse(pill.x + (iframeOff.ox || 0), pill.y + (iframeOff.oy || 0));
    log("已点击 打开精读模式 @", pill.x + (iframeOff.ox || 0), pill.y + (iframeOff.oy || 0));
    await sleep(5500);
    await dismissTimeout();
    opened = await raw(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false);
    log("精读打开:", opened);
  }
}
// —— ⑤ 点后截图（确认界面已变：出现「关闭精读模式」）——
const shotPost = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shotPost.data) { fs.writeFileSync("shots/U4-u4g560-post.png", Buffer.from(shotPost.data, "base64")); log("点击后截图:", fs.statSync("shots/U4-u4g560-post.png").size, "bytes"); }

// —— ⑥ 音频拖尾播完（模拟精读音频听完）——
const au = await raw(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>isFinite(x.duration)&&x.duration>0);
  if(!as.length)return {err:'no audio with duration',total:document.querySelectorAll('audio').length};
  const a=as[as.length-1];const d=a.duration;a.pause();a.playbackRate=16;a.muted=true;
  a.currentTime=Math.max(0,d-1.2);try{a.play().catch(()=>{});}catch(e){}
  a.dispatchEvent(new Event('timeupdate'));return {n:as.length,d:Math.round(d),t:Math.round(a.currentTime)};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("音频拖尾:", JSON.stringify(au));
await sleep(5000);
const auEnd = await raw(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>isFinite(x.duration)&&x.duration>0);
  const a=as[as.length-1];if(!a)return {err:'no audio'};a.currentTime=a.duration;
  a.dispatchEvent(new Event('timeupdate'));a.dispatchEvent(new Event('ended'));
  return {t:Math.round(a.currentTime),d:Math.round(a.duration),ended:a.ended};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("音频 ended:", JSON.stringify(auEnd));
await sleep(7000);

// —— ⑦ 慢滚停留，让阅读器自己上报 finishNode ——
for (let k = 0; k < 6; k++) {
  await raw(Q(`const e=document.getElementById(id);if(e)e.scrollIntoView({block:'center'});
    const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    sc.scrollBy(0,Math.round(innerHeight*0.5));return 1;`)).catch(() => 0);
  await sleep(2600);
}
// 关闭精读模式（若已打开）
if (opened) await raw(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>(x.innerText||'').replace(/\\s+/g,'')==='关闭精读模式'&&x.getBoundingClientRect().width>20);if(e)e.click();return 1;})()`).catch(() => 0);
await sleep(2500);

// —— ⑧ 命中本节点的 finishNode 上报 + DOM 证据 ——
const hitFin = net.filter(x => /finishNode/.test(x.url) && new RegExp(ID).test(x.post));
log("相关上报:", net.length, " 命中 u4g560 finishNode:", hitFin.length);
const dom = await raw(Q(`const b=document.getElementById(id);const t=b?(b.innerText||b.textContent||''):'';
  return {nodeId:${E},exists:!!b,len:t.length,status:b?b.getAttribute('data-lexical-node-status'):null,
    head:t.replace(/\\s+/g,' ').slice(0,200),hasOpenPill:/打开精读模式/.test(t),
    bodyHasClose:/关闭精读模式/.test(document.body.innerText)};`)).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 900));

// —— ⑨ 最终截图（目标路径）——
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("最终截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("最终截图失败");

// —— ⑩ 直接调 course_progress API 核验 state.pass（权威）——
const OPENID = "5cb554a204db411aa8958f116769407f";
const passCheck = await ev(`fetch('/course/api/v2/course_progress/${COURSE}/u${U}/${OPENID}/default',{credentials:'include'})
  .then(r=>r.text()).then(t=>{const j=JSON.parse(t);const v=j.rt?.leafs?.['u4g560'];
    return {found:!!v,state:v?v.state:null,tab:v?v.tab_type:null,pass:v?v.state?.pass:null,raw:String(t).slice(0,120)};})
  .catch(e=>({err:String(e).slice(0,150)}))`).catch(e => ({ err: String(e).slice(0, 150) }));
log("PASS CHECK:", JSON.stringify(passCheck));

fs.writeFileSync("_u4g560-exec.json", JSON.stringify({ healthy, probe, opened, pill, au, auEnd, hitFin, dom, net, passCheck, shot: SHOT }, null, 1));
cdp.close();
