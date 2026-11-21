// _u4g598_openpre.mjs — collapsible-block 按 base 处理第 1 步：滚动到目标块 + 展开前截图 + dump 折叠头坐标（不点击）
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g598-openpre]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 120)));
const ID = "mUDW2AIDlwgTvp2K";
const CH4 = CH[4];
const SHOT = "shots/U4-u4g598-openpre.png";

const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json())
  .filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH4.slice(0, 12)));
if (!tb) { log("NO TB CH4"); cdp.close(); process.exit(2); }
const raw = e => ev(e, tb.ctx);

// 硬纪律④：点前先 scrollIntoView；把目标折叠块滚到视口中央
const pos = await raw(`(()=>{
  const e=document.getElementById(${JSON.stringify(ID)});
  if(!e)return{err:'no element'};
  e.scrollIntoView({block:'center'});
  const head=e.querySelector('[class*=collapsible-head]')||e;
  const r=head.getBoundingClientRect();
  const body=e.querySelector('[class*=collapsible-content]');
  const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
  return {headRect:{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height)},
    hidden:body?body.hasAttribute('hidden'):null,contentLen:body?(body.innerText||'').length:0,
    scTop:Math.round(sc.scrollTop),scH:Math.round(sc.scrollHeight),clientH:Math.round(sc.clientHeight),
    headText:(head.innerText||'').replace(/\\s+/g,' ').slice(0,90)};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("目标折叠块位置:", JSON.stringify(pos));
await sleep(1500);

// 目录证据：Vocabulary 行 / 完成标记
const cat = await raw(`(()=>{
  const es=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];
  const hits=es.filter(e=>/Vocab|Step-by|Learning from|Language in use|Sentence structure|Unit test/i.test((e.innerText||'')));
  return hits.map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim().slice(0,60));})()`).catch(() => []);
log("目录命中:", JSON.stringify(cat));

fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("展开前截图:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("展开前截图失败");
fs.writeFileSync("_u4g598-openpre.json", JSON.stringify({ pos, cat, shot: SHOT }, null, 1));
cdp.close();
