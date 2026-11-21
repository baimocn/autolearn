// _u1g68_read.mjs — 当前 u1g68 块已水合：打开精读模式 → 音频拖尾播完 → finishNode → 截图 + DOM 证据
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u1g68-read]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));
const ID = "HIr7A5VEohcVAYs6";
const SHOT = "shots/U1-u1g68.png";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[1]) { target = t.id; break; }
}
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
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
  if (/finishNode|course_progress|readingtime|read|duration|complete|answer\/list/i.test(u)) net.push({ url: u.slice(-130), post: (p.request.postData || "").slice(0, 350) });
});
// healthy 探针
let healthy = false, probeLast = {};
for (let k = 0; k < 10 && !healthy; k++) {
  probeLast = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=document.getElementById(${JSON.stringify(ID)});
    return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
      targetLen:b?(b.innerText||'').length:0,hasOpen:b?[...b.querySelectorAll('*')].some(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式'):false};})()`).catch(() => ({}));
  if (probeLast.nonempty > 0 && tb.url.includes(CH[1])) { healthy = true; log("HEALTHY ✓", JSON.stringify(probeLast)); break; }
  await sleep(1500);
}
if (!healthy) { log("NOT HEALTHY"); cdp.close(); process.exit(3); }
// 若块又变 loading，点一下触发挂载
if (!probeLast.hasOpen || probeLast.targetLen < 100) {
  const p = await raw(`(()=>{const b=document.getElementById(${JSON.stringify(ID)});if(!b)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`).catch(() => null);
  if (p) { await sleep(700); await mouse(p.x, p.y); await sleep(4000); log("重新触发挂载"); }
}
// 点掉弹窗 + 清遮罩
for (const f of await frames()) {
  if (!/pc\.html|textbook/.test(f.url)) continue;
  const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (q) { await mouse(q.x, q.y); await sleep(1200); }
}
await raw(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`).catch(() => 0);
// 打开精读模式
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
let opened = await raw(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false);
if (!opened) {
  const pill = await raw(`(()=>{const b=document.getElementById(${JSON.stringify(ID)});
    if(!b)return null;b.scrollIntoView({block:'center'});
    const p=[...b.querySelectorAll('*')].find(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式');
    if(!p)return null;p.scrollIntoView({block:'center'});const r=p.getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};})()`).catch(() => null);
  log("打开精读按钮:", JSON.stringify(pill));
  if (pill) {
    await sleep(900); await mouse(pill.x + (off.ox || 0), pill.y + (off.oy || 0)); await sleep(5500);
    opened = await raw(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false);
    log("精读打开:", opened);
  }
}
// 音频拖尾播完
const au = await raw(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>isFinite(x.duration)&&x.duration>0);
  if(!as.length)return {err:'no audio',n:document.querySelectorAll('audio').length};
  const a=as[as.length-1];const d=a.duration;a.pause();a.playbackRate=16;a.muted=true;
  a.currentTime=Math.max(0,d-1.2);try{a.play().catch(()=>{});}catch(e){}
  a.dispatchEvent(new Event('timeupdate'));return {n:as.length,d:Math.round(d),t:Math.round(a.currentTime)};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
log("音频拖尾:", JSON.stringify(au));
await sleep(5000);
const st = await raw(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>isFinite(x.duration)&&x.duration>0);
  const a=as[as.length-1];if(!a)return '{}';a.currentTime=a.duration;
  a.dispatchEvent(new Event('timeupdate'));a.dispatchEvent(new Event('ended'));
  return JSON.stringify({t:Math.round(a.currentTime),d:Math.round(a.duration),ended:a.ended});})()`).catch(() => "{}");
log("音频状态:", st);
await sleep(8000);
for (let k = 0; k < 4; k++) {
  await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.6));return 1;})()`).catch(() => {});
  await sleep(2800);
}
const hitFin = net.filter(x => /finishNode/.test(x.url) && new RegExp(ID).test(x.post));
log("相关上报:", net.length, " 命中 u1g68 finishNode:", hitFin.length);
for (const h of hitFin.slice(0, 3)) log("  ", h.post.slice(0, 200));
// 关闭精读
await raw(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>(x.innerText||'').replace(/\\s+/g,'')==='关闭精读模式'&&x.getBoundingClientRect().width>20);if(e)e.click();return 1;})()`).catch(() => 0);
await sleep(2000);
// DOM 证据
const dom = await raw(`(()=>{const b=document.getElementById(${JSON.stringify(ID)});const t=b?(b.innerText||''):'';
  return {nodeId:${JSON.stringify(ID)},exists:!!b,len:t.length,head:t.replace(/\\s+/g,' ').slice(0,240),
    hasOpenPill:/打开精读模式/.test(t),status:b?b.getAttribute('data-lexical-node-status'):null,
    bodyHasDiscovering:/Discovering China/.test(document.body.innerText)};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1100));
// 截图
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
fs.writeFileSync("_u1g68-read.json", JSON.stringify({ healthy, probeLast, opened, au, st, hitFin, dom, net, shot: SHOT }, null, 1));
cdp.close();
