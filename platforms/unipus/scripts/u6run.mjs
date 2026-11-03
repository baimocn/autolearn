// u6run.mjs — 完成 U6 精读，同时抓网络（找进度上报接口）
import { connect } from "./utlib.mjs";
import { pickVisible } from "./vislib.mjs";
import { READER, COURSE } from "./reader.mjs";
import fs from "node:fs";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (m) => { const s = `[${new Date().toLocaleTimeString()}] ${m}`; console.log(s); fs.appendFileSync("u6.log", s + "\n"); };

const tid = await pickVisible();
const L = await connect(tid);
const { ev, frames, cdp, sessionId } = L;
const click = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, pointerType: "mouse" }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1, pointerType: "mouse" }, sessionId).catch(() => {});
  await sleep(110);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1, pointerType: "mouse" }, sessionId).catch(() => {});
};

// 网络抓包
const hits = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = p.request.url;
  if (/progress|record|study|read|duration|complete|heartbeat|log/i.test(u) && /unipus|ipub/.test(u)) {
    hits.push({ m: p.request.method, u: u.slice(0, 160), body: (p.request.postData || "").slice(0, 300) });
  }
});

await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/u6/u6g2` }, sessionId).catch(() => {});
await sleep(1500);
await cdp.send("Page.reload", {}, sessionId).catch(() => {});
await sleep(15000);
for (let k = 0; k < 3; k++) {
  if (!(await ev(`/本单元学习规则/.test(document.body.innerText)`).catch(() => false))) break;
  await click(639, 462); await sleep(1500); log("关弹窗");
}
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
if (!tb) { log("无教材帧"); process.exit(1); }
await ev(`(()=>{const keep=()=>{for(const m of document.querySelectorAll('[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}
 for(const w of document.querySelectorAll('[class*=bottom-wrapper]'))w.style.display='block';};
 keep(); if(window.__kp)clearInterval(window.__kp); window.__kp=setInterval(keep,300); return 1;})()`, tb.ctx).catch(() => 0);
const nB = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx);
log(`块数 ${nB}`);
let done = 0;
for (let i = 0; i < nB; i++) {
  const has = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
   if(!b)return 0;const h=[...b.querySelectorAll('*')].some(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式');
   if(h) b.scrollIntoView({block:'center'}); return h?1:0;})()`, tb.ctx).catch(() => 0);
  if (!has) continue;
  await sleep(1500);
  const pos = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
   const p=[...b.querySelectorAll('*')].find(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式');
   const rr=p.getBoundingClientRect();return rr.width>10?JSON.stringify({x:Math.round(rr.left+rr.width/2),y:Math.round(rr.top+rr.height/2)}):'zero';})()`, tb.ctx).catch(() => "zero");
  log(`#${i} pill ${pos}`);
  if (pos === "zero" || pos === "none") continue;
  const o = JSON.parse(pos);
  await click(o.x, o.y); await sleep(3000);
  if (await ev(`/本单元学习规则/.test(document.body.innerText)`).catch(() => false)) { await click(639, 462); await sleep(1500); await click(o.x, o.y); await sleep(6000); }
  await sleep(4000);
  const opened = await ev(`/关闭精读模式/.test(document.body.innerText)`, tb.ctx).catch(() => false);
  if (!opened) { log(`#${i} 未打开`); continue; }
  const act = await ev(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>x.duration>0);
   if(!as.length)return 'no audio';const a=as[as.length-1];a.playbackRate=2;if(a.paused)a.play();return 'play '+Math.round(a.duration);})()`, tb.ctx).catch(() => "err");
  log(`#${i} ${act}`);
  if (String(act).startsWith("play")) {
    for (let k = 0; k < 110; k++) {
      await sleep(8000);
      const s = await ev(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>x.duration>0);const a=as[as.length-1];
       if(!a)return '{}';return JSON.stringify({t:Math.round(a.currentTime),d:Math.round(a.duration),e:a.ended});})()`, tb.ctx).catch(() => "{}");
      let j = {}; try { j = JSON.parse(s); } catch {}
      if (j.e || (j.d && j.t >= j.d - 1)) { log(`  ✓ ${j.t}/${j.d}`); break; }
    }
  }
  await sleep(3000);
  await ev(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>(x.innerText||'').replace(/\\s+/g,'')==='关闭精读模式'&&x.getBoundingClientRect().width>20);if(e)e.click();return 1;})()`, tb.ctx).catch(() => {});
  await sleep(2500);
  done++;
}
log(`U6 完成 ${done} 篇`);
log(`网络命中 ${hits.length} 条`);
fs.writeFileSync("net-u6.json", JSON.stringify(hits, null, 1));
for (const h of hits.slice(0, 12)) log(`  ${h.m} ${h.u}`);
L.cdp.close();
