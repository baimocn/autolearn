// _u4g560_probe.mjs — 阶段A只读诊断：chapterId / 题目块 / 目标块 / 弹窗 / 截图（不点击）
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g560-probe]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const ID = "oMrcWJawhYiLWVMS";
const U = 4;
const SHOT = "shots/U4-u4g560-probe.png";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
log("ucontent 标签数:", tabs.length, tabs.map(t => t.id));
let target = null, chapters = [];
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb0 = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  chapters.push({ id: t.id, ch, url: tb0 ? tb0.url.slice(0, 120) : null });
  L0.cdp.close();
  if (ch === CH[U]) { target = t.id; break; }
}
log("各标签 chapter:", JSON.stringify(chapters), " CH[4]=", CH[U]);
if (!target) target = tabs[0]?.id;
if (!target) { log("NO READER TAB"); process.exit(2); }
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
log("frames:", JSON.stringify(fl.map(f => ({ url: (f.url || "").slice(0, 110), hasCtx: !!f.ctx }))));
const raw = (e) => ev(e, tb?.ctx);
const diag = await raw(`(()=>{
  const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const b=document.getElementById(${JSON.stringify(ID)});
  const t=b?(b.innerText||b.textContent||''):'';
  const body=document.body.innerText||'';
  return {
    url:location.href.slice(0,160),
    blocks:bs.length,
    nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
    textNonempty:bs.filter(x=>(x.textContent||'').replace(/\\s+/g,'').length>5).length,
    targetExists:!!b, targetLen:t.length,
    targetStatus:b?b.getAttribute('data-lexical-node-status'):null,
    targetHead:t.replace(/\\s+/g,' ').slice(0,160),
    hasOpenPill:/打开精读模式/.test(t), hasClosePill:/关闭精读模式/.test(body),
    rulePopup:/本单元学习规则/.test(body),
    knowBtn:[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test((e.innerText||'').replace(/\\s+/g,''))&&e.getBoundingClientRect().width>15).length,
    audioN:document.querySelectorAll('audio').length,
    bodyHead:body.replace(/\\s+/g,' ').slice(0,220)
  };})()`).catch(e => ({ err: String(e).slice(0, 200) }));
log("DIAG:", JSON.stringify(diag, null, 1));
// 顶层 iframe 偏移
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|textbook/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};})()`).catch(() => ({ ox: 0, oy: 0 }));
log("iframe offset:", JSON.stringify(off));
// 截图
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("截图失败");
fs.writeFileSync("_u4g560-probe.json", JSON.stringify({ target, chapters, diag, off, shot: SHOT }, null, 1));
cdp.close();
