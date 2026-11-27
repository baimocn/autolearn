// _u4g573_mount.mjs — 第2轮步骤B：关抽屉→滚动挂载目标块→点击前截图→上传控件坐标清单
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[g573-mnt]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 160)));
const ANCHOR = "VhDiwq6t7LToLXyo";
const PRE = "shots/U4-u4g573-pre.png";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[4].slice(0, 12)));
if (!tb) { log("NO TB"); cdp.close(); process.exit(2); }
const raw = e => ev(e, tb.ctx);

// ① 关目录抽屉（视觉已确认 X 按钮在左上 ~[455,34]；先 DOM 校验真实坐标）
const xp = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`).catch(() => null);
log("抽屉关闭按钮:", JSON.stringify(xp));
if (xp) { await mouse(xp.x, xp.y); await sleep(1500); log("已点关闭抽屉"); }

// ② 反复 scrollIntoView 目标块 + 向下滚动预热，等待懒加载挂载（最多 12 轮）
let blk = {};
for (let k = 0; k < 12; k++) {
  await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=bs.find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
    if(b)b.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
  await sleep(1800);
  // 辅助滚动：让 IntersectionObserver 触发相邻块
  await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.35));return 1;})()`).catch(() => 0);
  await sleep(1200);
  blk = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=bs.find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
    const t=b?(b.innerText||'').replace(/\\s+/g,' '):'';
    return {status:b?b.getAttribute('data-lexical-node-status'):null,len:t.length,text:t.slice(0,180),
      fi:b?b.querySelectorAll('input[type=file]').length:0,
      nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
      ups:b?[...b.querySelectorAll('.ant-upload-btn,[class*=upload-drag],[class*=uploadBtn],input[type=file]')].length:0};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
  log(`mount#${k}:`, JSON.stringify(blk));
  if (blk.fi > 0 || blk.len > 30) break;
}

// ③ 读取上传控件 / 提交按钮真实坐标（scrollIntoView + getBoundingClientRect 纪律）
const layout = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const b=bs.find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
  if(!b)return{err:'no block'};b.scrollIntoView({block:'center'});
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  const ups=[...b.querySelectorAll('.ant-upload-btn,[class*=upload-drag],[class*=uploadBtn],input[type=file]')].map(e=>{const r=e.getBoundingClientRect();return{cls:(e.className||'').toString().slice(0,60),tag:e.tagName,x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height)};});
  const subs=[...b.querySelectorAll('div,button,[class*=i-button],span')].filter(e=>(e.innerText||'').replace(/\\s+/g,'')==='提交'&&e.getBoundingClientRect().width>25).map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,cls:(e.className||'').toString().slice(0,50),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};});
  const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));
  const off=f?{ox:Math.round(f.getBoundingClientRect().left),oy:Math.round(f.getBoundingClientRect().top)}:{ox:0,oy:0};
  return{idx:bs.indexOf(b),anchor:b.getAttribute('data-lexical-node-anchor'),status:b.getAttribute('data-lexical-node-status'),
    len:t.length,text:t.slice(0,300),fileInputs:b.querySelectorAll('input[type=file]').length,
    hasUploadText:/Upload your work here|点击或将文件拖拽|上传|Upload/.test(t),hasRedo:/重新作答|重新提交/.test(t),
    hasAnswer:/答案|Reference/.test(t),hasScore:/得分/.test(t),ups,subs,off,
    bodyHasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(document.body.innerText||'')};})()`).catch(e => ({ err: String(e).slice(0, 160) }));
await sleep(1200);
log("LAYOUT:", JSON.stringify(layout, null, 1).slice(0, 2400));

// ④ 点击前截图（视觉确认上传控件真实位置）
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(PRE, Buffer.from(shot.data, "base64")); log("点击前截图:", PRE, fs.statSync(PRE).size, "bytes"); }
fs.writeFileSync("_u4g573-mount.json", JSON.stringify({ blk, layout, shot: PRE }, null, 1));
cdp.close();
