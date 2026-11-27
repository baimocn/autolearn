// _u4g560_clean.mjs — 关「本单元学习规则」弹窗 + 关目录抽屉 → 干净探测 healthy（只读+关弹窗）
import { connect } from "./utlib.mjs";
import { CH, closeDrawer } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[clean]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const ID = "oMrcWJawhYiLWVMS";
const U = 4;
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb0 = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[U]) { target = t.id; break; }
}
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
// 关规则弹窗 + 所有「我知道了/知道了/确定」
for (let k = 0; k < 4; k++) {
  let clicked = 0;
  for (const f of await frames()) {
    if (!/pc\.html|textbook/.test(f.url)) continue;
    const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);
      if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
      const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);return{x,y,hit:document.elementFromPoint(x,y)?.tagName,text:n(e.innerText)};})()`, f.ctx).catch(() => null);
    if (q && (q.hit === "BUTTON" || q.hit === "DIV" || q.hit === "SPAN")) { await mouse(q.x, q.y); log("关弹窗:", JSON.stringify(q)); clicked++; await sleep(1200); }
  }
  if (!clicked) break;
}
// 关目录抽屉
try { await closeDrawer(L); } catch {}
await sleep(1500);
// 清遮罩
for (const f of await frames()) {
  await ev(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop],[class*=modalOverlay]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`, f.ctx).catch(() => 0);
}
// 干净探测
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
const st = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const b=document.getElementById(${JSON.stringify(ID)});
  return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
    textNonempty:bs.filter(x=>(x.textContent||'').replace(/\\s+/g,'').length>5).length,
    targetLen:b?(b.innerText||b.textContent||'').length:0,targetStatus:b?b.getAttribute('data-lexical-node-status'):null,
    hasOpenPill:b?/打开精读模式/.test(b.innerText||b.textContent||''):false,
    unitTest:/考前须知/.test(document.body.innerText),rulePopup:/本单元学习规则/.test(document.body.innerText),
    audioN:document.querySelectorAll('audio').length,
    bodyHead:(document.body.innerText||'').replace(/\\s+/g,' ').slice(0,160)};})()`, tb.ctx).catch(e => ({ err: String(e).slice(0, 150) }));
log("CLEAN STATE:", JSON.stringify(st, null, 1));
const s = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (s.data) { fs.writeFileSync("shots/U4-u4g560-clean2.png", Buffer.from(s.data, "base64")); log("截图:", fs.statSync("shots/U4-u4g560-clean2.png").size); }
fs.writeFileSync("_u4g560-clean.json", JSON.stringify(st, null, 1));
cdp.close();
