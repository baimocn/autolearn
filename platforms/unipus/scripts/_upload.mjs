// _upload.mjs <blockIndex> <filepath> — 直接给块内 input[type=file] 设文件
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
import path from "node:path";
const IDX = Number(process.argv[2] || 18);
const FILE = process.argv[3] || "u7-upload.pdf";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const obj = await cdp.send("Runtime.evaluate", {
  expression: `(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];return b&&b.querySelector('input[type=file]');})()`,
  contextId: tb.ctx,
}, sessionId);
const objectId = obj.result && obj.result.objectId;
console.log("objectId", objectId ? objectId.slice(0, 40) : null);
if (!objectId) { console.log("NO OBJECT ID"); cdp.close(); process.exit(2); }
const abs = path.resolve(FILE);
console.log("file", abs, fs.existsSync(abs) ? fs.statSync(abs).size + "B" : "MISSING");
try {
  const res = await cdp.send("DOM.setFileInputFiles", { files: [abs], objectId }, sessionId);
  console.log("setFileInputFiles OK", JSON.stringify(res));
} catch (e) { console.log("setFileInputFiles ERR", String(e).slice(0, 250)); }
await sleep(2500);
const after = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];return (b.innerText||'').replace(/[ ]+/g,' ').slice(0,300);})()`, tb.ctx).catch(e => String(e));
console.log("after:", after);
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("upload-after.png", Buffer.from(data, "base64"));
cdp.close();
