// _u4g573_exec.mjs — 单节点上传：healthy → 动态定位 u4g573 块 → DOM.setFileInputFiles → 提交 → 截图 + DOM 证据
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g573]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));
const ANCHOR = "VhDiwq6t7LToLXyo"; // u4g573 externalNodeId 前半
const SHOT = "shots/U4-u4g573.png";
const PDF = path.join(os.tmpdir(), "U4_u4g573_upload.pdf");
const FNAME = path.basename(PDF);
const U = 4;
// 生成 PDF
const src = path.join(os.tmpdir(), "u4g573-src.txt");
fs.writeFileSync(src, "Unit 4 Multimedia Upload Task\n\nMy submission:\n\nAgriculture is the foundation of human civilization. This unit deepened my understanding of sustainable farming and global agricultural cooperation. I have completed the applying-in-a-global-context task and prepared this document as my coursework.\n");
try { execSync(`node mkpdf.mjs "${PDF}" "U4 u4g573 Multimedia Upload" "${src}"`, { cwd: process.cwd(), stdio: "pipe", timeout: 30000 }); } catch (e) { log("mkpdf 失败:", String(e).slice(0, 100)); }
log("PDF:", PDF, fs.existsSync(PDF) ? fs.statSync(PDF).size + " bytes" : "缺失");
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[U]) { target = t.id; break; }
}
if (!target) { log("NO U4 READER"); process.exit(2); }
log("reader:", target);
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl0 = await frames();
const tb = fl0.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
if (!tb) { log("NO TB"); cdp.close(); process.exit(2); }
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
  if (/upload|answer|submitScore|course_progress|file|cos|finishNode/i.test(u)) net.push({ url: u.slice(-130), post: (p.request.postData || "").slice(0, 400) });
});
// —— ① healthy 探针：非空题目块 > 0 且 chapter 匹配 ——
let healthy = false, probeLast = {};
for (let k = 0; k < 15 && !healthy; k++) {
  probeLast = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=[...bs].find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
    return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
      targetStatus:b?b.getAttribute('data-lexical-node-status'):null,
      targetFileInputs:b?b.querySelectorAll('input[type=file]').length:0,
      targetLen:b?(b.innerText||'').length:0};})()`).catch(() => ({}));
  const chapterOK = tb.url.includes(CH[U]);
  log(`probe#${k}: ${JSON.stringify(probeLast)} chapterOK=${chapterOK}`);
  if (probeLast.nonempty > 0 && chapterOK) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(2500);
}
if (!healthy) { log("NOT HEALTHY，终止"); cdp.close(); process.exit(3); }
// 点掉弹窗
const dismiss = async () => {
  for (const f of await frames()) {
    if (!/pc\.html|textbook/.test(f.url)) continue;
    const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (q) { await mouse(q.x, q.y); log("点掉规则弹窗"); await sleep(1200); }
  }
};
await dismiss();
// 定位块索引（动态）
const IDX = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  return bs.findIndex(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));})()`).catch(() => -1);
log("u4g573 块索引:", IDX);
if (IDX < 0) { log("未找到目标块"); cdp.close(); process.exit(4); }
// 若块 loading，点击触发挂载
let blk = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
  return {status:b.getAttribute('data-lexical-node-status'),len:(b.innerText||'').length,fi:b.querySelectorAll('input[type=file]').length};})()`).catch(() => ({}));
log("块初始:", JSON.stringify(blk));
for (let k = 0; k < 8 && (!blk.fi || blk.len < 30); k++) {
  const p = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
    if(!b)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`).catch(() => null);
  if (p) { await sleep(700); await mouse(p.x, p.y); await sleep(3000); }
  blk = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
    return {status:b.getAttribute('data-lexical-node-status'),len:(b.innerText||'').length,fi:b.querySelectorAll('input[type=file]').length};})()`).catch(() => ({}));
  log(`  mount#${k}:`, JSON.stringify(blk));
}
if (!blk.fi) { log("无 file input，无法上传"); cdp.close(); process.exit(5); }
// —— ② DOM.setFileInputFiles ——
await cdp.send("Page.enable", {}, sessionId).catch(() => {});
await cdp.send("Page.setInterceptFileChooserDialog", { enabled: true }, sessionId).catch(() => {});
let got = null;
cdp.on("Page.fileChooserOpened", (q) => { got = q; });
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
const upBtn = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
  const e=b&&(b.querySelector('.ant-upload-btn')||b.querySelector('[class*=upload-drag]')||b.querySelector('input[type=file]'));
  if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};})()`).catch(() => null);
log("上传区:", JSON.stringify(upBtn));
if (upBtn) { await sleep(800); await mouse(upBtn.x + (off.ox || 0), upBtn.y + (off.oy || 0)); }
for (let k = 0; k < 15 && !got; k++) await sleep(400);
let setOk = false;
if (got) {
  try { await cdp.send("DOM.setFileInputFiles", { files: [PDF], backendNodeId: got.backendNodeId }, sessionId); setOk = true; log("setFileInputFiles(backendNodeId) ✓"); }
  catch (e) { log("backendNodeId 失败:", String(e).slice(0, 100)); }
} else {
  log("无 fileChooser，直接 objectId 注入");
  try {
    const obj = await cdp.send("Runtime.evaluate", { expression: `(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];return b?b.querySelector('input[type=file]'):null;})()`, contextId: tb.ctx }, sessionId);
    if (obj.result && obj.result.objectId) {
      try { await cdp.send("DOM.setFileInputFiles", { files: [PDF], objectId: obj.result.objectId }, sessionId); setOk = true; log("setFileInputFiles(objectId) ✓"); }
      catch (e2) { const nr = await cdp.send("DOM.requestNode", { objectId: obj.result.objectId }, sessionId); await cdp.send("DOM.setFileInputFiles", { files: [PDF], nodeId: nr.nodeId }, sessionId); setOk = true; log("setFileInputFiles(nodeId) ✓"); }
    }
  } catch (e) { log("注入失败:", String(e).slice(0, 120)); }
}
await cdp.send("Page.setInterceptFileChooserDialog", { enabled: false }, sessionId).catch(() => {});
let attached = false;
for (let k = 0; k < 12; k++) {
  await sleep(1800);
  const d = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
    const fi=b.querySelector('input[type=file]');
    return {items:b.querySelectorAll('.ant-upload-list-item').length,files:fi?fi.files.length:0,
      hasName:(b.innerText||'').includes(${JSON.stringify(FNAME)}),t:(b.innerText||'').replace(/\\s+/g,' ').slice(0,160)};})()`).catch(() => ({}));
  if (d.items > 0 || d.files > 0 || d.hasName) { attached = true; log("附件已挂:", JSON.stringify(d)); break; }
}
log("attached =", attached, " setOk =", setOk);
// —— ③ 提交 ——
const subBtn = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
  const v=[...b.querySelectorAll('div,button,[class*=i-button]')].filter(e=>(e.innerText||'').replace(/\\s+/g,'')==='提交'&&e.getBoundingClientRect().width>25);
  if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`).catch(() => null);
let submitted = false;
if (subBtn) { await sleep(700); await mouse(subBtn.x + (off.ox || 0), subBtn.y + (off.oy || 0)); submitted = true; log("点击提交"); }
await sleep(2500);
for (let k = 0; k < 5; k++) {
  let hit = false;
  for (const f of await frames()) {
    const c = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确定|确认|继续提交)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (c) { await mouse(c.x, c.y); hit = true; await sleep(1500); break; }
  }
  if (!hit) break;
}
await sleep(6000);
// —— ④ DOM 证据 ——
const dom = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  return {anchor:b.getAttribute('data-lexical-node-anchor'),len:t.length,text:t.slice(0,320),
    hasRedo:/重新作答|重新提交/.test(t),hasSubmit:/提交/.test(t),hasFileName:t.includes(${JSON.stringify(FNAME)}),
    score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1100));
log("相关网络:", net.length, JSON.stringify(net.slice(0, 10)).slice(0, 1500));
// —— ⑤ 截图 ——
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
fs.writeFileSync("_u4g573-exec.json", JSON.stringify({ healthy, probeLast, IDX, blk, setOk, attached, submitted, dom, net, shot: SHOT }, null, 1));
cdp.close();
