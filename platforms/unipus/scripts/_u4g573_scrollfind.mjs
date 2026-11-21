// _u4g573_scrollfind.mjs — 找到教材 iframe 内真正的滚动容器 + 尝试挂载目标块
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[g573-sf]", ...a);
const ANCHOR = "VhDiwq6t7LToLXyo";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[4].slice(0, 12)));
const raw = e => ev(e, tb.ctx);
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
// 列出所有可滚动元素
const scrollables = await raw(`(()=>{const out=[];const walk=(d)=>{const s=getComputedStyle(d);if(/(auto|scroll)/.test(s.overflowY)&&d.scrollHeight>d.clientHeight+50){const r=d.getBoundingClientRect();out.push({cls:(d.className||'').toString().slice(0,60),id:d.id||'',tag:d.tagName,sh:d.scrollHeight,ch:d.clientHeight,st:d.scrollTop,w:Math.round(r.width),h:Math.round(r.height)});}for(const c of d.children)walk(c);};walk(document.documentElement);return out;})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("SCROLLABLES:", JSON.stringify(scrollables, null, 1).slice(0, 2000));

// 用 Wheel 事件滚动 + scrollTop 直接设置，逐块滚到第21块
const IDX = 21;
const targetPos = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const b=bs[${IDX}];if(!b)return null;const r=b.getBoundingClientRect();return{top:Math.round(r.top),abs:Math.round(r.top+(window.scrollY||0)),h:Math.round(r.height)};})()`).catch(() => null);
log("TARGET POS:", JSON.stringify(targetPos));

// 找到最可能的滚动容器并直接把目标块滚进视口
const scrollInfo = await raw(`(()=>{const out=[];
  const walk=(d)=>{const s=getComputedStyle(d);if(/(auto|scroll)/.test(s.overflowY)&&d.scrollHeight>d.clientHeight+50)out.push(d);for(const c of d.children)walk(c);};
  walk(document.documentElement);
  const sc=out.sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];
  if(!sc)return{err:'no sc',n:out.length};
  const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const b=bs[${IDX}];
  if(!b)return{err:'no blk'};
  const br=b.getBoundingClientRect(),sr=sc.getBoundingClientRect();
  const before={st:sc.scrollTop,sh:sc.scrollHeight,ch:sc.clientHeight,brTop:Math.round(br.top),srTop:Math.round(sr.top)};
  sc.scrollTop += (br.top-sr.top)-100;
  return{before,after:{st:sc.scrollTop},cls:(sc.className||'').toString().slice(0,60)};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("SCROLL SET:", JSON.stringify(scrollInfo));
await sleep(3500);
// 真实滚轮事件（在视口中央），触发 IntersectionObserver
const vp = await raw(`(()=>({w:innerWidth,h:innerHeight}))()`).catch(() => ({ w: 1600, h: 900 }));
for (let k = 0; k < 3; k++) {
  const cx = Math.round(vp.w * 0.5), cy = Math.round(vp.h * 0.5);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: cx, y: cy, deltaX: 0, deltaY: 500 }, sessionId).catch(() => {});
  await sleep(1500);
}
const st = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const b=bs[${IDX}];const t=b?(b.innerText||'').replace(/\\s+/g,' '):'';
  const out=[];const walk=(d)=>{const s=getComputedStyle(d);if(/(auto|scroll)/.test(s.overflowY)&&d.scrollHeight>d.clientHeight+50)out.push({cls:(d.className||'').toString().slice(0,50),st:d.scrollTop,sh:d.scrollHeight});for(const c of d.children)walk(c);};walk(document.documentElement);
  return{status:b?b.getAttribute('data-lexical-node-status'):null,len:t.length,text:t.slice(0,150),fi:b?b.querySelectorAll('input[type=file]').length:0,
    nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,scrolls:out,
    bodyLen:(document.body.innerText||'').length};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("AFTER SCROLL:", JSON.stringify(st, null, 1).slice(0, 2200));
// 截图
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync("shots/U4-u4g573-pre.png", Buffer.from(shot.data, "base64")); log("截图:", fs.statSync("shots/U4-u4g573-pre.png").size, "bytes"); }
fs.writeFileSync("_u4g573-scrollfind.json", JSON.stringify({ scrollables, targetPos, scrollInfo, st, shot: "shots/U4-u4g573-pre.png" }, null, 1));
cdp.close();
