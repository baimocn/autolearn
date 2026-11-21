import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
const U=process.argv[2]||1; const CHAIN=(process.argv[3]||"u1>u1g98>u1g101").split(">");
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
for(const t of (await(await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>/ucontent/.test(t.url)))await boot.send("Target.closeTarget",{targetId:t.id}).catch(()=>{});
await sleep(700);
const route=CHAIN.join("/");
const r=await boot.send("Target.createTarget",{url:`${READER}#/${COURSE}/courseware/${route}`});
boot.close();
await sleep(15000);
const L=await connect(r.targetId);
const {ev,frames,cdp,sessionId}=L;
let tb=null;
for(let k=0;k<40&&!tb;k++){tb=(await frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);if(!tb)await sleep(1000);}
const fin=[];
await cdp.send("Network.enable",{},sessionId).catch(()=>{});
cdp.on("Network.requestWillBeSent",(p)=>{if(/finishNode/.test(p.request&&p.request.url||""))fin.push(1);});
await sleep(3000);
for(let s=0;s<15;s++){
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*0.9));return 1;})()`,tb.ctx).catch(()=>{});
  await sleep(2500);
}
const hash=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.id===r.targetId).url.split("#")[1]||"";
console.log("hash:",hash.slice(-45));
console.log("finishNode:",fin.length);
L.cdp.close();
