import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
const U=process.argv[2]||1; const NODE=process.argv[3]||"u1g101";
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
for(const t of (await(await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>/ucontent/.test(t.url)))await boot.send("Target.closeTarget",{targetId:t.id}).catch(()=>{});
await sleep(700);
const r=await boot.send("Target.createTarget",{url:`${READER}#/${COURSE}/courseware/u${U}/${NODE}`});
boot.close();
await sleep(15000);
const L=await connect(r.targetId);
const {ev,frames,cdp,sessionId}=L;
let tb=null;
for(let k=0;k<40&&!tb;k++){tb=(await frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);if(!tb)await sleep(1000);}
if(!tb){console.log("NO TB");process.exit(1);}
const fin=[];
await cdp.send("Network.enable",{},sessionId).catch(()=>{});
cdp.on("Network.requestWillBeSent",(p)=>{if(/finishNode/.test(p.request&&p.request.url||""))fin.push(1);});
await sleep(3000);
// 慢滚 20 屏
for(let s=0;s<20;s++){
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*0.9));return 1;})()`,tb.ctx).catch(()=>{});
  await sleep(2500);
}
const lens=await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`,tb.ctx).catch(()=>[]);
console.log(`node ${NODE}: finishNode=${fin.length} blocks=${lens.length} rendered=${(lens||[]).filter(x=>x>80).length}`);
console.log("LENS:",JSON.stringify((lens||[]).slice(0,30)));
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
const fs=await import("node:fs");
fs.writeFileSync(`node-${NODE}.png`,Buffer.from(data,"base64"));
L.cdp.close();
