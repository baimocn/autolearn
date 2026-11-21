// _u4g573_diag.mjs — 综合诊断：关抽屉(顶帧视觉坐标) + 限流提示 + 网络问题接口 + 挂载重试 + 点击前截图
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[g573-dia]", ...a);
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
// 网络监控：题目数据接口 / 限流响应
const net = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", p => { const u = p.request?.url || ""; if (/question|exercise|limit|rate|answer|node/i.test(u)) net.push({ u: u.slice(-120), post: (p.request.postData || "").slice(0, 120) }); });
cdp.on("Network.responseReceived", p => { if (p.response?.status >= 400) net.push({ status: p.response.status, u: (p.response.url || "").slice(-120) }); });

const tb0 = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
log("tb:", !!tb0, " top:", !!top, " chap:", tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "");
// ① 顶帧诊断：抽屉/弹窗/限流文本
const topInfo = await ev(`(()=>{const b=document.body.innerText||'';const close=[...document.querySelectorAll('[class*=drawer-close],[class*=catalog_drawer-close],svg,button,div,span')].filter(e=>{const r=e.getBoundingClientRect();return r.width>10&&r.width<60&&r.height>10&&r.height<60&&r.top<80&&r.left>380&&r.left<520;}).map(e=>{const r=e.getBoundingClientRect();return{cls:(e.className||'').toString().slice(0,50),tag:e.tagName,x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}).slice(0,8);
  return {drawerOpen:/目录/.test(b)&&/Applying in a global context/.test(b),closeCandidates:close,
    hasLimit:/限流|稍后再试|非单元学习周期|加载失败|请求频繁/.test(b),bodyLen:b.length,
    popups:[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了|继续学习|开始学习|确定)$/.test((e.innerText||'').replace(/\\s+/g,''))&&e.getBoundingClientRect().width>20).length};})()`, top && top.ctx).catch(e => ({ err: String(e).slice(0, 150) }));
log("TOP:", JSON.stringify(topInfo));
// 关抽屉：优先真实坐标（截图目视 X 在 ~[455,34]），DOM 校验
if (topInfo.closeCandidates && topInfo.closeCandidates.length) {
  const c = topInfo.closeCandidates[0];
  await mouse(c.x, c.y); log("点顶帧关闭按钮:", JSON.stringify(c)); await sleep(1800);
} else { await mouse(455, 34); log("点视觉坐标 455,34 关抽屉"); await sleep(1800); }
// 点掉所有 "我知道了" 弹窗（各帧）
for (let i = 0; i < 3; i++) {
  let hit = false;
  for (const f of await frames()) {
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了|继续学习|开始学习)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (p) { await mouse(p.x, p.y); hit = true; await sleep(1200); break; }
  }
  if (!hit) break;
}
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[4].slice(0, 12)));
const raw = e => ev(e, tb.ctx);
// ② 挂载重试：scrollIntoView + 大步滚动 + 点击块中心（触发懒挂载），每轮探针
let blk = {};
for (let k = 0; k < 10; k++) {
  const p = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=bs.find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
    if(!b)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();
    return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),h:Math.round(r.height),idx:bs.indexOf(b)};})()`).catch(() => null);
  await sleep(1200);
  if (p) { await mouse(p.x, p.y); log(`  click blk#${k}:`, JSON.stringify(p)); }
  await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.6));return 1;})()`).catch(() => 0);
  await sleep(2200);
  blk = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=bs.find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
    const t=b?(b.innerText||'').replace(/\\s+/g,' '):'';
    return {status:b?b.getAttribute('data-lexical-node-status'):null,len:t.length,text:t.slice(0,150),
      fi:b?b.querySelectorAll('input[type=file]').length:0,
      nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
      doneIdxs:bs.map((x,i)=>({i,s:x.getAttribute('data-lexical-node-status')})).filter(o=>o.s==='done').map(o=>o.i),
      bodyHasLimit:/限流|稍后再试|非单元学习周期|加载失败|请求频繁/.test(document.body.innerText||'')};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
  log(`mount#${k}:`, JSON.stringify(blk));
  if (blk.fi > 0 || blk.len > 30) break;
}
// ③ 上传控件坐标清单
const layout = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const b=bs.find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
  if(!b)return{err:'no block'};b.scrollIntoView({block:'center'});
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  const ups=[...b.querySelectorAll('.ant-upload-btn,[class*=upload-drag],[class*=uploadBtn],input[type=file]')].map(e=>{const r=e.getBoundingClientRect();return{cls:(e.className||'').toString().slice(0,60),tag:e.tagName,x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height)};});
  const subs=[...b.querySelectorAll('div,button,[class*=i-button],span')].filter(e=>(e.innerText||'').replace(/\\s+/g,'')==='提交'&&e.getBoundingClientRect().width>25).map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};});
  const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));
  const off=f?{ox:Math.round(f.getBoundingClientRect().left),oy:Math.round(f.getBoundingClientRect().top)}:{ox:0,oy:0};
  return{idx:bs.indexOf(b),len:t.length,text:t.slice(0,260),fileInputs:b.querySelectorAll('input[type=file]').length,ups,subs,off,
    hasUploadText:/Upload your work here|点击或将文件拖拽|上传|Upload/.test(t),hasRedo:/重新作答|重新提交/.test(t)};})()`).catch(e => ({ err: String(e).slice(0, 160) }));
await sleep(1200);
log("LAYOUT:", JSON.stringify(layout, null, 1).slice(0, 2200));
log("NET:", JSON.stringify(net.slice(0, 16)).slice(0, 1600));
// ④ 点击前截图
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(PRE, Buffer.from(shot.data, "base64")); log("点击前截图:", PRE, fs.statSync(PRE).size, "bytes"); }
fs.writeFileSync("_u4g573-diag.json", JSON.stringify({ topInfo, blk, layout, net: net.slice(0, 16), shot: PRE }, null, 1));
cdp.close();
