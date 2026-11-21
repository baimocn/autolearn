// _intensive.mjs — 当前页面打开精读模式 → 播完音频 → 关闭 → 触发 pass
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[int]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 110)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const raw = e => ev(e, tb.ctx);
// 1) 关弹窗
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  const p = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(我知道了|知道了)$/.test(n(e.innerText)));if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (p) { await mouse(p.x, p.y); await sleep(1200); }
}
// 2) 点可见的「打开精读模式」
let opened = 0;
for (let k = 0; k < 4 && !opened; k++) {
  const p = await raw(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('*')].filter(e=>e.children.length<=1&&n(e.innerText)==='打开精读模式'&&e.getBoundingClientRect().width>40);if(!v.length)return null;const e=v[0];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};})()`).catch(() => null);
  log("btn", JSON.stringify(p));
  if (p) { await mouse(p.x, p.y); opened = 1; }
  await sleep(2500);
}
if (!opened) { log("NO INTENSIVE BUTTON"); cdp.close(); process.exit(2); }
await sleep(2500);
// 3) 检查面板 + 音频
const st1 = await raw(`(()=>{const auds=[...document.querySelectorAll('audio')];const closeBtns=[...document.querySelectorAll('*')].filter(e=>e.children.length<=1&&/关闭精读/.test((e.innerText||''))&&e.getBoundingClientRect().width>30);
 return {audios:auds.map(a=>({dur:Math.round(a.duration||0),cur:Math.round(a.currentTime||0),paused:a.paused})).slice(0,6),close:closeBtns.length,txt:document.body.innerText.length};})()`).catch(e => String(e));
log("opened state", JSON.stringify(st1));
// 4) 预热 + 播完
const play = await raw(`(async()=>{
 const auds=[...document.querySelectorAll('audio')].filter(a=>a.duration>0||true);
 let done=0;
 for(const a of auds){
  try{
   a.muted=true;
   await a.play().catch(()=>{});
   await new Promise(r=>setTimeout(r,400));
   const d=a.duration;
   if(d&&isFinite(d)&&d>1){
    a.currentTime=Math.max(0,d-1.2);
    a.playbackRate=16;
    await a.play().catch(()=>{});
    done++;
   }
  }catch(e){}
 }
 return {total:auds.length,played:done};})()`).catch(e => String(e));
log("play", JSON.stringify(play));
await sleep(8000);
// 5) 再播一次确保 ended
const play2 = await raw(`(async()=>{let n=0;for(const a of [...document.querySelectorAll('audio')]){try{const d=a.duration;if(d&&isFinite(d)&&d>0){a.currentTime=d;a.dispatchEvent(new Event('timeupdate'));a.dispatchEvent(new Event('ended'));n++;}}catch(e){}}return n;})()`).catch(e => String(e));
log("dispatch ended", play2);
await sleep(2000);
// 6) 关闭精读
const close = await raw(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('*')].filter(e=>e.children.length<=1&&/关闭精读/.test(n(e.innerText))&&e.getBoundingClientRect().width>30);if(!v.length)return 'none';v[0].click();return 'closed';})()`).catch(e => String(e));
log("close", close);
await sleep(3000);
// 7) 慢滚一下
for (let s = 0; s < 6; s++) { await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.85));return 1;})()`).catch(() => {}); await sleep(1200); }
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("intensive-done.png", Buffer.from(data, "base64"));
log("DONE");
cdp.close();
