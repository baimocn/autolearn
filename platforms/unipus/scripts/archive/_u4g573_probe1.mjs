// _u4g573_probe1.mjs — 第1轮：视觉优先探针 + healthy 检查 + 截图
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[g573-p1]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 160)));
const ANCHOR = "VhDiwq6t7LToLXyo";
const SHOT = "shots/U4-u4g573.png";
fs.mkdirSync("shots", { recursive: true });

const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
log("reader tabs:", tabs.length, tabs.map(t => t.url.slice(-60)));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  log("  chapter:", ch);
  if (ch === CH[4]) { target = t.id; break; }
}
if (!target) { log("NO U4 READER"); process.exit(2); }
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[4].slice(0, 12)));
log("tb:", tb ? tb.url.slice(-90) : "NONE");
if (!tb) { cdp.close(); process.exit(3); }
const raw = e => ev(e, tb.ctx);

// 持续轮询 healthy 探针：非空题目块 > 0 且 chapter 匹配
let healthy = false, last = {};
for (let k = 0; k < 20 && !healthy; k++) {
  last = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=[...bs].find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
    return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
      statuses:[...new Set(bs.map(x=>x.getAttribute('data-lexical-node-status')))],
      targetStatus:b?b.getAttribute('data-lexical-node-status'):null,
      targetFileInputs:b?b.querySelectorAll('input[type=file]').length:0,
      targetLen:b?(b.innerText||'').length:0,
      bodyLen:(document.body.innerText||'').length};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
  const chapterOK = tb.url.includes(CH[4]);
  log(`probe#${k}: ${JSON.stringify(last)} chapterOK=${chapterOK}`);
  if (last.nonempty > 0 && chapterOK) { healthy = true; break; }
  await sleep(2500);
}
log("HEALTHY:", healthy);

// 视觉优先：截图
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("截图失败");

// DOM 详单（含上传控件、正文片段）
const detail = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const b=bs.find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
  const t=b?(b.innerText||'').replace(/\\s+/g,' '):'';
  const body=document.body.innerText||'';
  return {idx:bs.indexOf(b),anchor:b?b.getAttribute('data-lexical-node-anchor'):null,
    status:b?b.getAttribute('data-lexical-node-status'):null,len:t.length,text:t.slice(0,300),
    fileInputs:b?b.querySelectorAll('input[type=file]').length:0,
    uploadBtn:b?!!b.querySelector('.ant-upload-btn,[class*=upload-drag],[class*=uploadBtn]'):false,
    hasUploadText:/Upload your work here|点击或将文件拖拽|上传|Upload/.test(t),
    hasRedo:/重新作答|重新提交/.test(t),hasScore:/得分/.test(t),
    hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body),
    hasLogin:/登录|账号|密码|SSO/.test(body),bodyLen:body.length};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("DETAIL:", JSON.stringify(detail));
fs.writeFileSync("_u4g573-probe1.json", JSON.stringify({ healthy, last, detail, shot: SHOT }, null, 1));
cdp.close();
