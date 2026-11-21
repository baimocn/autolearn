import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
const ROUTE=process.argv[2]||"u2>u2g256>u2g270>u2g271>u2g1144";
const path=ROUTE.split(">").join("/");
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
if(!rd){console.log("NO READER");process.exit(0);}
const L=await connect(rd.id);
const {ev,cdp,sessionId}=L;
await cdp.send("Page.enable",{},sessionId).catch(()=>{});
const url=`${READER}#/${COURSE}/courseware/${path}`;
await cdp.send("Page.navigate",{url},sessionId).catch(()=>{});
await sleep(20000);
const ev2=async(e)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true},sessionId);return r.result?.value;};
let tb=null;
for(let k=0;k<30&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);if(!tb)await sleep(1000);}
if(!tb){console.log("NO TB");process.exit(1);}
const fin=[];await cdp.send("Network.enable",{},sessionId).catch(()=>{});
cdp.on("Network.requestWillBeSent",(p)=>{if(/finishNode/.test(p.request&&p.request.url||""))fin.push(1);});
for(let s=0;s<14;s++){
  await ev2(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(window.innerHeight*0.92));return 1;})()`).catch(()=>{});
  await sleep(2200);
}
console.log("finishNode:",fin.length);
L.cdp.close();
