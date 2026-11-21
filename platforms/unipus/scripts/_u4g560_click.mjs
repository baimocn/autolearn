// _u4g560_click.mjs — 收尾：当前页已 healthy 且 pill 可见，直接点「打开精读模式」→ 音频→等待→核验 pass
import { connect } from "./utlib.mjs";
import { COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g560-click]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const ID = "oMrcWJawhYiLWVMS";
const U = 4;
const SHOT = "shots/U4-u4g560.png";
const E = JSON.stringify(ID);
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
const net = [], prog = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/course_progress/.test(u)) prog.push({ id: p.requestId, url: u, body: null });
  if (/finishNode|course_progress|readingtime/i.test(u)) net.push({ url: u.slice(-130), post: (p.request.postData || "").slice(0, 400) });
});
cdp.on("Network.loadingFinished", (p) => {
  const r = prog.find(x => x.id === p.requestId);
  if (r) cdp.send("Network.getResponseBody", { requestId: p.requestId }, sessionId).then(b => { r.body = b.body; }).catch(() => {});
});
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
const raw = (e) => ev(e, tb.ctx);
const Q = (b) => `(()=>{const id=${E};${b}})()`;
// healthy 复核
const h = await raw(Q(`const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  return{blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length};`)).catch(() => ({}));
log("healthy 复核:", JSON.stringify(h), "chapterOK:", tb.url.includes(CH[U]));
if (!(tb.url.includes(CH[U]) && (h.nonempty || 0) > 0)) { log("NOT HEALTHY，终止"); cdp.close(); process.exit(3); }
// 定位 pill（画面底部中央已视觉确认）+ elementFromPoint 校验
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|textbook/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
let opened = await raw(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false);
let pillOK = null;
for (let k = 0; k < 8 && !opened; k++) {
  const p = await raw(Q(`const b=document.getElementById(id);if(!b)return{err:'no elem'};b.scrollIntoView({block:'center'});
    const pl=[...b.querySelectorAll('*')].find(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式'&&e.getBoundingClientRect().width>10);
    if(!pl)return{err:'no pill',len:(b.innerText||'').length,status:b.getAttribute('data-lexical-node-status')};
    pl.scrollIntoView({block:'center'});const r=pl.getBoundingClientRect();
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);const at=document.elementFromPoint(x,y);
    const ok=!!at&&(pl===at||pl.contains(at)||at.contains(pl));
    return{x,y,w:Math.round(r.width),h:Math.round(r.height),ok,at:at?(at.tagName+'.'+(at.className||'').toString().slice(0,40)):null,
      atText:at?(at.innerText||'').replace(/\\s+/g,'').slice(0,30):''};`)).catch(e => ({ err: String(e).slice(0, 150) }));
  log(`pill#${k}:`, JSON.stringify(p));
  if (p && !p.err && p.ok && Number.isFinite(p.x)) {
    pillOK = p; await sleep(900);
    await mouse(p.x + (off.ox || 0), p.y + (off.oy || 0));
    log("点击 打开精读模式 @", p.x + (off.ox || 0), p.y + (off.oy || 0));
    await sleep(6000);
    opened = await raw(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false);
    log("精读打开:", opened);
  } else await sleep(2000);
}
// 点后截图
const s1 = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (s1.data) { fs.writeFileSync("shots/U4-u4g560-opened.png", Buffer.from(s1.data, "base64")); log("点后截图:", fs.statSync("shots/U4-u4g560-opened.png").size); }
// 音频拖尾 + ended（若精读已打开）
const au = await raw(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>isFinite(x.duration)&&x.duration>0);
  if(!as.length)return{err:'no audio with duration',total:document.querySelectorAll('audio').length};
  const a=as[as.length-1];const d=a.duration;a.pause();a.playbackRate=16;a.muted=true;a.currentTime=Math.max(0,d-1.2);
  try{a.play().catch(()=>{});}catch(e){}a.dispatchEvent(new Event('timeupdate'));return{n:as.length,d:Math.round(d)};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
log("音频拖尾:", JSON.stringify(au));
await sleep(5000);
const auEnd = await raw(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>isFinite(x.duration)&&x.duration>0);
  const a=as[as.length-1];if(!a)return{err:'no audio'};a.currentTime=a.duration;a.dispatchEvent(new Event('timeupdate'));a.dispatchEvent(new Event('ended'));
  return{t:Math.round(a.currentTime),d:Math.round(a.duration),ended:a.ended};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
log("音频 ended:", JSON.stringify(auEnd));
// 录音结束等 16 秒（硬纪律③）
await sleep(16000);
for (let k = 0; k < 6; k++) {
  await raw(Q(`const e=document.getElementById(id);if(e)e.scrollIntoView({block:'center'});
    const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.45));return 1;`)).catch(() => 0);
  await sleep(2600);
}
const hitFin = net.filter(x => /finishNode/.test(x.url) && new RegExp(ID).test(x.post));
log("相关上报:", net.length, " 命中本节点 finishNode:", hitFin.length);
const dom = await raw(Q(`const b=document.getElementById(id);const t=b?(b.innerText||b.textContent||''):'';
  return{nodeId:${E},exists:!!b,len:t.length,status:b?b.getAttribute('data-lexical-node-status'):null,
    head:t.replace(/\\s+/g,' ').slice(0,160),hasOpenPill:/打开精读模式/.test(t),bodyHasClose:/关闭精读模式/.test(document.body.innerText)};`)).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 800));
// 最终截图
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("最终截图:", SHOT, fs.statSync(SHOT).size); }
// 核验 state.pass
const findPass = () => {
  for (const r of prog) { if (!r.body || !/\/u4\//.test(r.url)) continue;
    try { const j = JSON.parse(r.body); const v = j.rt?.leafs?.["u4g560"]; if (v) return { src: "captured", unit: j.rt?.unit_id, state: v.state, pass: v.state?.pass, tab: v.tab_type }; } catch {} }
  return null;
};
let check = findPass();
if (!check) {
  const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
  await ev(`location.hash='#/${COURSE}/courseware/u4/u4g558/u4g559/u4g560'`, top.ctx).catch(() => {});
  await sleep(7000); check = findPass();
}
if (!check) check = { err: "未捕获到 u4 进度响应", n: prog.length };
log("PASS CHECK:", JSON.stringify(check));
fs.writeFileSync("_u4g560-exec.json", JSON.stringify({ healthy: h, pillOK, opened, au, auEnd, hitFin, dom, net, check, shot: SHOT }, null, 1));
cdp.close();
