// _videos.mjs — 当前章节页：把每个视频播到最后 2 秒触发 ended
import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
if (!tb) { console.log("NO TB"); process.exit(1); }
await cdp.send("Network.enable", {}, sessionId).catch(()=>{});
let fin=0; cdp.on("Network.requestWillBeSent", p => { if(/finishNode/.test((p.request&&p.request.url)||"")) fin++; });
const n = await ev(`(()=>{const vs=[...document.querySelectorAll('video')];return vs.length;})()`, tb.ctx).catch(()=>0);
console.log("videos:", n, "finishNode-before:", fin);
for (let i=0;i<n;i++) {
  const r = await ev(`(async()=>{
    const v=[...document.querySelectorAll('video')][${i}];
    if(!v)return 'novideo';
    v.scrollIntoView({block:'center'});
    try{v.muted=true;await v.play();}catch(e){}
    await new Promise(r=>setTimeout(r,600));
    const d=v.duration;
    if(!d||!isFinite(d))return 'nodur';
    v.currentTime=Math.max(0,d-2.2); v.playbackRate=16;
    try{await v.play();}catch(e){}
    return {dur:Math.round(d),cur:Math.round(v.currentTime),rate:v.playbackRate};
  })()`, tb.ctx).catch(e=>String(e).slice(0,80));
  console.log(`  #${i}`, JSON.stringify(r));
  await sleep(5000);
}
console.log("finishNode-after:", fin);
cdp.close();
