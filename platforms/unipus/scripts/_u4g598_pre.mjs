// _u4g598_pre.mjs — 只读探测：chapter / healthy 探针 / 目标折叠块 / 弹窗抽屉 / 点击前截图（不点击、不导航）
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g598-pre]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 120)));
const ID = "mUDW2AIDlwgTvp2K";
const CH4 = CH[4];
const SHOT = "shots/U4-u4g598-pre.png";

const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json())
  .filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
const candidates = [];
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb0 = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  candidates.push({ id: t.id.slice(0, 14), chapter: ch, matchCH4: ch === CH4 });
  L0.cdp.close();
  if (ch === CH4) { target = t.id; break; }
}
log("candidates:", JSON.stringify(candidates));
if (!target) { log("NO U4 READER (chapter !== CH[4])"); process.exit(2); }
log("reader target:", target);

const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH4.slice(0, 12)));
if (!tb) { log("NO TB FRAME"); cdp.close(); process.exit(2); }
const raw = e => ev(e, tb.ctx);

// healthy 探针（硬纪律②：非空题目块>0 且 chapterId 匹配）
const probe = await raw(`(()=>{
  const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const nonempty=bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length;
  const e=document.getElementById(${JSON.stringify(ID)});
  const b=e?e.querySelector('[class*=collapsible-content]'):null;
  return {chapterOK:${JSON.stringify(tb.url.includes(CH4))},blocks:bs.length,nonempty,
    targetExists:!!e,targetLen:e?(e.textContent||'').length:0,
    hidden:b?b.hasAttribute('hidden'):null,contentLen:b?(b.innerText||'').length:0,
    bodyLen:(document.body.innerText||'').length,
    hasRuleModal:/本单元学习规则/.test(document.body.innerText||''),
    drawer:!!document.querySelector('[class*=catalog_drawer-close]')};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("healthy probe:", JSON.stringify(probe));

// 顶层帧：弹窗 / 抽屉状态（只读）
const top = fl.find(f => /pc\.html/.test(f.url) && f.ctx);
let topInfo = null;
if (top) {
  topInfo = await ev(`(()=>{
    const m=[...document.querySelectorAll('.ant-modal-wrap')].filter(x=>getComputedStyle(x).display!=='none');
    const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test((e.innerText||'').replace(/\\s+/g,''))&&e.getBoundingClientRect().width>15);
    const btn=v.length?(()=>{const r=v[v.length-1].getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})():null;
    return {visibleModals:m.length,ruleBtn:btn,url:location.href.slice(0,120)};})()`, top.ctx).catch(e => ({ err: String(e).slice(0, 120) }));
}
log("top frame:", JSON.stringify(topInfo));

// 点击前截图
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("前置截图:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("前置截图失败");
fs.writeFileSync("_u4g598-pre.json", JSON.stringify({ candidates, target, chapter: CH4, probe, topInfo, shot: SHOT }, null, 1));
cdp.close();
