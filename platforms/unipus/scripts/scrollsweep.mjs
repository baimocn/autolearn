// scrollsweep.mjs <unit> [screens] — 纯滚动上报 text 节点（不限流版：匀速 3.5s/屏）
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
const U = Number(process.argv[2]);
const SCREENS = Number(process.argv[3] || 45);
const SEC = Number(process.argv[4] || 3.5);
const log = (...a) => console.log(`[ss${U}]`, ...a);
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
let tb = null;
for (let k = 0; k < 40 && !tb; k++) {
  tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes((CH[U] || "??").slice(0, 12)));
  if (!tb) await sleep(1000);
}
if (!tb) { log("NO TB"); process.exit(1); }
const fin = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => { if (/finishNode/.test(p.request && p.request.url || "")) fin.push(1); });
await ev(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`, tb.ctx).catch(() => {});
await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=0;return 1;})()`, tb.ctx).catch(() => {});
await sleep(1500);
for (let s = 0; s < SCREENS; s++) {
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*0.92));return 1;})()`, tb.ctx).catch(() => {});
  await sleep(SEC * 1000);
}
log("finishNode 上报:", fin.length);
cdp.close();
