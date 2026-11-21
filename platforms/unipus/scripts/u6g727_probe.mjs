// u6g727_probe.mjs — 单节点 u6g727 (rich_text_read) 只读诊断：
//  当前路由/章节、question-block 列表、弹窗、精读 pill、course_progress 实时 pass、截图
import { connect, sleep } from "./utlib.mjs";
import { CH, COURSE } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[u6g727-probe]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const U = 6, SHOT = "shots/U6-u6g727.png";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
log("reader tabs:", tabs.length);
if (!tabs.length) { log("NO READER"); process.exit(1); }
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
log("FRAMES:\n" + fl.map(f => "  " + (f.url || "").slice(0, 150) + (f.ctx ? " [ctx]" : "")).join("\n"));
const top = fl.find(f => /pc\.html/.test(f.url) && f.ctx);
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
log("top?", !!top, "tb?", !!tb, "tb.url:", tb && tb.url);
if (top) { const h = await ev(`location.hash`, top.ctx).catch(() => null); log("HASH:", h); }
const chap = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
log("chapter:", chap, "CH[6]:", CH[6], "match:", chap === CH[6]);
let blocks = [];
if (tb) {
  blocks = await ev(`(()=>[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map((b,i)=>({i,id:b.id,status:b.getAttribute('data-lexical-node-status'),len:(b.innerText||'').replace(/\\s+/g,'').length,head:(b.innerText||'').replace(/\\s+/g,' ').slice(0,70)})))()`, tb.ctx).catch(e => [{ err: String(e).slice(0, 150) }]);
  log("BLOCKS(" + blocks.length + "):", JSON.stringify(blocks).slice(0, 4000));
}
if (tb) {
  const f = await ev(`(()=>{const t=document.body.innerText||'';return {bodyLen:t.length,hasOpen:/打开精读模式/.test(t),hasClose:/关闭精读模式/.test(t),audio:document.querySelectorAll('audio').length,hasTimeout:/长时间未操作/.test(t),sample:t.replace(/\\s+/g,' ').slice(0,220)};})()`, tb.ctx).catch(e => ({ err: String(e).slice(0, 150) }));
  log("TB FLAGS:", JSON.stringify(f));
}
if (top) {
  const f = await ev(`(()=>{const t=document.body.innerText||'';return {len:t.length,hasRule:/本单元学习规则|我知道了/.test(t),hasTimeout:/长时间未操作/.test(t),sample:t.replace(/\\s+/g,' ').slice(0,220)};})()`, top.ctx).catch(e => ({ err: String(e).slice(0, 150) }));
  log("TOP FLAGS:", JSON.stringify(f));
}
if (top) {
  for (const p of [
    `/course/api/v2/course_progress/${COURSE}/u6/default`,
    `/course/api/v2/course_progress/${COURSE}/u6/5cb554a204db411aa8958f116769407f/default`,
    `/course/api/v2/course_progress/${COURSE}/u6/c81712bd863e44a6b73c4ca69cfa9de5/default`,
  ]) {
    const r = await ev(`fetch(${JSON.stringify(p)},{credentials:'include'}).then(async r=>{const t=await r.text();let j=null;try{j=JSON.parse(t)}catch{};const v=j&&j.rt&&j.rt.leafs&&j.rt.leafs['u6g727'];return {status:r.status,len:t.length,u6g727:v?{state:v.state,tab:v.tab_type,pass:v.state&&v.state.pass}:null,raw:t.slice(0,110)};}).catch(e=>({err:String(e).slice(0,120)}))`, top.ctx).catch(e => ({ err: String(e).slice(0, 120) }));
    log("API", p.slice(0, 72), "=>", JSON.stringify(r).slice(0, 420));
  }
}
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("SHOT:", SHOT, fs.statSync(SHOT).size, "bytes"); }
else log("SHOT FAILED");
fs.writeFileSync("_u6g727-probe.json", JSON.stringify({ tabs: tabs.length, frames: fl.map(f => f.url), chap, chapOK: chap === CH[6], blocks, tbUrl: tb && tb.url }, null, 1));
cdp.close();
