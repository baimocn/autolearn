// _oralrun1.mjs <index> — 单标签内导航到录音节点链，确认渲染，报告控件
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
import fs from "node:fs";
const IDX = Number(process.argv[2] || 0);
const list = JSON.parse(fs.readFileSync("_oralnodes.json", "utf8"));
const node = list[IDX];
const log = (...a) => console.log(`[or${IDX}]`, ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 100)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(()=>{});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const clean = async () => {
  for (const f of await frames()) {
    if (!/pc\.html/.test(f.url)) continue;
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(()=>null);
    if (p) { await mouse(p.x, p.y); await sleep(1000); }
  }
  const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
  if (tb) {
    const c = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(()=>null);
    if (c) { await mouse(c.x, c.y); await sleep(800); }
  }
};
await cdp.send("Page.enable", {}, sessionId).catch(()=>{});
await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/${node.chain}` }, sessionId);
log("navigate", node.chain);
for (let k = 0; k < 4; k++) {
  await sleep(11000);
  await clean();
  const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
  if (!tb) { log(`probe${k}: no tb`); continue; }
  const st = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const ne=bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;const rec=[...document.querySelectorAll('[class*=record_record-prepare],[class*=record_record-recording]')].length;return {blocks:bs.length,nonempty:ne,rec,txt:document.body.innerText.length};})()`, tb.ctx).catch(e=>String(e));
  log(`probe${k+1}:`, JSON.stringify(st));
  if (st && st.nonempty > 0) break;
  await cdp.send("Page.reload", { ignoreCache: true }, sessionId).catch(()=>{});
}
cdp.close();
