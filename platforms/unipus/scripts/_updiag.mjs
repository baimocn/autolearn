// 诊断：u1 #26 上传块，直接给 file input 注入
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const U = 1, I = 26;
const BOOK = (await import("./config.mjs")).BOOK;
const TMP = process.env.TEMP;
const log = (...a) => console.log("[upd]", ...a);
const b0 = await CDP.connect((await (await fetch("http://127.0.0.1:9222/json/version")).json()).webSocketDebuggerUrl);
for (const t of (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/u${U}g2` });
b0.close();
await sleep(11000);
const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;
let tb = null;
for (let k = 0; k < 55; k++) { tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[U].slice(0, 12))); if (tb) { const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0); if (n > 0) break; } await sleep(1000); }
const raw = async (e) => { const rr = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, userGesture: true, contextId: tb.ctx }, sessionId); if (rr.exceptionDetails) return { __err: ((rr.exceptionDetails.exception && rr.exceptionDetails.exception.description) || "").slice(0, 100) }; return rr.result && rr.result.value; };
// 滚到块
for (let k = 0; k < 8; k++) {
  await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];if(!b)return 0;
    const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const rr=b.getBoundingClientRect(),box=sc.getBoundingClientRect();sc.scrollTop+=(rr.top-box.top)-25;return 1;})()`);
  await sleep(1500);
  const n = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];return b?b.querySelectorAll('input[type=file]').length:-1;})()`);
  log("file inputs:", n);
  if (n > 0) break;
}
// 生成 pdf
const src = path.join(TMP, "upsrc-u1-26.txt");
fs.writeFileSync(src, "Unit 1 Task 26\n\nMy Answer:\n\nAgriculture has always been the foundation of human civilization. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy. Studying this unit deepened my understanding of agriculture.\n");
const pdf = path.join(TMP, "U1_Task26.pdf");
execSync(`node mkpdf.mjs "${pdf}" "U1 Task26" "${src}"`, { cwd: process.cwd(), stdio: "pipe" });
log("pdf:", fs.existsSync(pdf));
// DOM.setFileInputFiles via backend node id
await cdp.send("DOM.enable", {}, sessionId).catch(() => {});
let doc = null;
for (let k = 0; k < 3 && !doc; k++) { try { doc = await cdp.send("DOM.getDocument", { depth: -1, pierce: true }, tb.ctx ? undefined : sessionId); } catch (e) { log("getDoc err", String(e).slice(0, 80)); break; } }
// 用 Runtime 找 input 的 objectId，再 DOM.requestNode
const objRes = await cdp.send("Runtime.evaluate", { expression: `(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];const f=b&&b.querySelector('input[type=file]');return f?f:null;})()`, contextId: tb.ctx }, sessionId);
if (objRes.exceptionDetails || !objRes.result || !objRes.result.objectId) { log("no input obj"); process.exit(1); }
const objId = objRes.result.objectId;
const nodeRes = await cdp.send("DOM.requestNode", { objectId: objId }, sessionId);
log("backendNodeId:", nodeRes.nodeId);
try {
  await cdp.send("DOM.setFileInputFiles", { files: [pdf], nodeId: nodeRes.nodeId }, sessionId);
  log("set files by nodeId ok");
} catch (e) {
  log("set by nodeId failed:", String(e).slice(0, 100));
  try {
    await cdp.send("DOM.setFileInputFiles", { files: [pdf], objectId: objId }, sessionId);
    log("set files by objectId ok");
  } catch (e2) { log("set by objectId failed:", String(e2).slice(0, 100)); }
}
await sleep(3000);
const st = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const fi=b.querySelector('input[type=file]');
  return {files:fi?fi.files.length:0, uploadItems:b.querySelectorAll('.ant-upload-list-item').length,
    t:(b.innerText||'').replace(/\\s+/g,' ').slice(0,120)};})()`);
log("after set:", JSON.stringify(st));
// 提交
await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&(e.innerText||'').replace(/\\s+/g,'')==='提交');
  if(el)el.click();return !!el;})()`);
await sleep(5000);
const fin = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  return {redo:/重新作答/.test(t), score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, t:t.slice(0,100)};})()`);
log("final:", JSON.stringify(fin));
cdp.close();
