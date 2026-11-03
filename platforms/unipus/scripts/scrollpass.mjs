// scrollpass.mjs <unit> [秒/屏] — 慢滚整章，统计 finishNode 上报数（阅读器自己上报）
import { connect } from "./utlib.mjs";
import { pickVisible } from "./vislib.mjs";
import { READER, COURSE } from "./reader.mjs";
import fs from "node:fs";

const U = Number(process.argv[2]);
const SEC = Number(process.argv[3] || 12);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (m) => { const s = `[${new Date().toLocaleTimeString()}] ${m}`; console.log(s); fs.appendFileSync("scroll.log", s + "\n"); };

const tid = await pickVisible();
const L = await connect(tid);
const { ev, frames, cdp, sessionId } = L;
const click = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1, pointerType: "mouse" }, sessionId).catch(() => {});
  await sleep(110);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1, pointerType: "mouse" }, sessionId).catch(() => {});
};

const fin = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  if (/finishNode/.test(p.request.url)) {
    try { const b = JSON.parse(p.request.postData || "{}"); fin.push(b.nodeType + ":" + b.nodeId); } catch {}
  }
});

await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/u${U}/u${U}g2` }, sessionId).catch(() => {});
await sleep(1500);
await cdp.send("Page.reload", {}, sessionId).catch(() => {});
await sleep(14000);
for (let k = 0; k < 3; k++) {
  if (!(await ev(`/本单元学习规则/.test(document.body.innerText)`).catch(() => false))) break;
  await click(639, 462); await sleep(1200);
}
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
if (!tb) { log("无教材帧"); process.exit(1); }
await ev(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}
 for(const c of document.querySelectorAll('[class*=collapsible-container]')){const b=c.querySelector('[class*=collapsible-content]');if(b&&b.getBoundingClientRect().height<20){const h=c.querySelector('[class*=collapsible-head]');if(h)h.click();}}
 return 1;})()`, tb.ctx).catch(() => 0);
await sleep(2000);
const sc0 = await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=0;return Math.round(sc.scrollHeight/window.innerHeight);})()`, tb.ctx).catch(() => 0);
log(`U${U} 屏数≈${sc0}，每屏 ${SEC}s`);
for (let s = 0; s < Math.min(130, Math.max(8, sc0)); s++) {
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*1.0));return 1;})()`, tb.ctx).catch(() => {});
  await sleep(SEC * 1000);
}
log(`U${U} 完成，finishNode 上报 ${fin.length} 条`);
const byType = {};
for (const f of fin) { const t = f.split(":")[0]; byType[t] = (byType[t] || 0) + 1; }
log("按类型：" + JSON.stringify(byType));
fs.writeFileSync(`fin-u${U}.json`, JSON.stringify(fin, null, 1));
L.cdp.close();
