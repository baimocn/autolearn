// _u1g185_exec.mjs — 单节点执行：healthy → DOM.setFileInputFiles 上传 → 提交 → 截图 + DOM 证据
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u1g185]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));

const SHOT = "shots/U1-u1g185.png";
const BLK = 26; // 上传块索引（诊断确认）
const PDF = path.join(os.tmpdir(), "U1_u1g185_upload.pdf");
const FNAME = path.basename(PDF);
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
if (!target) { log("NO U1 READER"); process.exit(2); }
log("reader:", target);
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
  if (/upload|answer|submit|progress|file|oss|cos|finishNode/i.test(u)) net.push({ url: u.slice(-130), post: (p.request.postData || "").slice(0, 200) });
});

// —— ① healthy 探针：非空题目块 > 0 且 chapter 匹配 ——
let healthy = false, probeLast = {};
for (let k = 0; k < 20 && !healthy; k++) {
  probeLast = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    return {blocks:bs.length,nonempty:bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length,
      ups:bs.filter(b=>b.querySelector('input[type=file]')).length};})()`).catch(() => ({}));
  const chapterOK = tb.url.includes(CH[1]);
  log(`probe#${k}: ${JSON.stringify(probeLast)} chapterOK=${chapterOK}`);
  if (probeLast.nonempty > 0 && chapterOK && probeLast.ups > 0) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(2500);
}
if (!healthy) { log("NOT HEALTHY，终止"); cdp.close(); process.exit(3); }
if (!fs.existsSync(PDF)) { log("PDF 不存在:", PDF); cdp.close(); process.exit(4); }

// 点掉晚到弹窗 + 确保上传块可见（scrollIntoView 后再取坐标）
for (const f of await frames()) {
  if (!/pc\.html|textbook/.test(f.url)) continue;
  const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
  if (q) { await mouse(q.x, q.y); log("点掉规则弹窗"); await sleep(1200); }
}
// 展开包住上传块的折叠区（若还有）
await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${BLK}];
  const cs=[...document.querySelectorAll('[data-lexical-node-type=collapsible-block]')].filter(c=>c.contains(b));
  cs.forEach(c=>{const bd=c.querySelector('[class*=collapsible-content]');if(bd&&bd.hasAttribute('hidden')){const h=c.querySelector('[class*=collapsible-head]');if(h)h.click();}});
  if(b)b.scrollIntoView({block:'center'});return 1;})()`).catch(() => 0);
await sleep(2500);

// —— ② DOM.setFileInputFiles 上传（拦截 file chooser） ——
await cdp.send("Page.enable", {}, sessionId).catch(() => {});
await cdp.send("Page.setInterceptFileChooserDialog", { enabled: true }, sessionId).catch(() => {});
let got = null;
cdp.on("Page.fileChooserOpened", (q) => { got = q; });
// 点 .ant-upload-btn（先 scrollIntoView 再取坐标，用 CDP 真鼠标）
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
const upBtn = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${BLK}];
  const e=b&&(b.querySelector('.ant-upload-btn')||b.querySelector('[class*=upload-drag]')||b.querySelector('input[type=file]'));
  if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),tag:e.tagName};})()`).catch(() => null);
log("上传按钮:", JSON.stringify(upBtn), "iframe off:", JSON.stringify(off));
if (upBtn) { await sleep(800); await mouse(upBtn.x + (off.ox || 0), upBtn.y + (off.oy || 0)); log("点击上传区 @", upBtn.x + (off.ox || 0), upBtn.y + (off.oy || 0)); }
for (let k = 0; k < 15 && !got; k++) await sleep(400);
log("fileChooserOpened:", got ? JSON.stringify({ backendNodeId: got.backendNodeId, mode: got.mode }) : "无");
let setOk = false;
if (got) {
  try { await cdp.send("DOM.setFileInputFiles", { files: [PDF], backendNodeId: got.backendNodeId }, sessionId); setOk = true; log("DOM.setFileInputFiles ✓"); }
  catch (e) { log("setFileInputFiles 失败:", String(e).slice(0, 120)); }
} else {
  // 兜底：直接找 input 的 objectId / nodeId 注入
  log("兜底：直接给 input 注入");
  try {
    const obj = await cdp.send("Runtime.evaluate", { expression: `(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${BLK}];return b?b.querySelector('input[type=file]'):null;})()`, contextId: tb.ctx }, sessionId);
    if (obj.result && obj.result.objectId) {
      try { await cdp.send("DOM.setFileInputFiles", { files: [PDF], objectId: obj.result.objectId }, sessionId); setOk = true; log("setFileInputFiles(objectId) ✓"); }
      catch (e2) {
        const nr = await cdp.send("DOM.requestNode", { objectId: obj.result.objectId }, sessionId);
        await cdp.send("DOM.setFileInputFiles", { files: [PDF], nodeId: nr.nodeId }, sessionId);
        setOk = true; log("setFileInputFiles(nodeId) ✓");
      }
    }
  } catch (e) { log("兜底注入失败:", String(e).slice(0, 120)); }
}
await cdp.send("Page.setInterceptFileChooserDialog", { enabled: false }, sessionId).catch(() => {});
// 等附件挂上
let attached = false;
for (let k = 0; k < 12; k++) {
  await sleep(1800);
  const d = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${BLK}];
    const fi=b.querySelector('input[type=file]');
    return {items:b.querySelectorAll('.ant-upload-list-item').length,files:fi?fi.files.length:0,
      hasName:(b.innerText||'').includes(${JSON.stringify(FNAME)}),t:(b.innerText||'').replace(/\\s+/g,' ').slice(0,180)};})()`).catch(() => ({}));
  if (d.items > 0 || d.files > 0 || d.hasName) { attached = true; log("附件已挂上:", JSON.stringify(d)); break; }
  if (k % 3 === 2) log(`  等待附件 #${k}:`, JSON.stringify(d));
}
log("attached =", attached, " setOk =", setOk);

// —— ③ 提交（scrollIntoView 后取坐标，CDP 真鼠标） ——
const subBtn = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${BLK}];
  const v=[...b.querySelectorAll('div,button,[class*=i-button]')].filter(e=>(e.innerText||'').replace(/\\s+/g,'')==='提交'&&e.getBoundingClientRect().width>25&&e.getBoundingClientRect().height>10);
  if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};})()`).catch(() => null);
log("提交按钮:", JSON.stringify(subBtn));
let submitted = false;
if (subBtn) { await sleep(700); await mouse(subBtn.x + (off.ox || 0), subBtn.y + (off.oy || 0)); submitted = true; log("点击提交 @", subBtn.x + (off.ox || 0), subBtn.y + (off.oy || 0)); }
await sleep(2500);
// 确认弹窗（确定/确认，跨 frame）
for (let k = 0; k < 5; k++) {
  let hit = false;
  for (const f of await frames()) {
    if (!f.ctx) continue;
    const oy = /textbook/.test(f.url) ? (off.oy || 0) : 0;
    const c = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,[class*=i-button],div,span')].filter(e=>/^(确定|确认|继续提交)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);
      if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
      return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy}),t:n(e.innerText)};})()`, f.ctx).catch(() => null);
    if (c) { log("确认:", JSON.stringify(c)); await mouse(c.x, c.y); hit = true; await sleep(1800); break; }
  }
  if (!hit) break;
}
await sleep(6000);

// —— ④ DOM 证据 ——
const dom = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${BLK}];
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  return {nodeId:'vC4pzKMx1bKd3tph==IZawuDsCbkbPAnjy',blockIndex:${BLK},
    status:b.getAttribute('data-lexical-node-status'),text:t.slice(0,300),
    hasSubmit:/提交/.test(t),hasRedo:/重新作答|重新提交/.test(t),
    score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null,
    uploadItems:b.querySelectorAll('.ant-upload-list-item').length,
    fileCount:(()=>{const fi=b.querySelector('input[type=file]');return fi?fi.files.length:0})(),
    hasFileName:t.includes(${JSON.stringify(FNAME)}),
    bodyHasUpload:/Upload your work here|最多支持上传/.test(document.body.innerText)};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1200));
log("相关网络请求:", net.length, JSON.stringify(net.slice(0, 12)).slice(0, 1600));

// —— ⑤ 截图 ——
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("截图失败");
fs.writeFileSync("_u1g185-exec.json", JSON.stringify({ healthy, probeLast, pdf: PDF, setOk, attached, submitted, dom, net, shot: SHOT }, null, 1));
cdp.close();
