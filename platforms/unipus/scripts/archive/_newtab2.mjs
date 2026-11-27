import { CDP, sleep } from "./cdp.mjs";
import { READER, COURSE } from "./reader.mjs";
import { connect } from "./utlib.mjs";
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
const r=await boot.send("Target.createTarget",{url:`${READER}#/${COURSE}/courseware/u2/u2g2`});
boot.close();
await sleep(10000);
const L=await connect(r.targetId);
let tb=null;
for(let k=0;k<25&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);if(!tb)await sleep(1000);}
if(!tb){console.log("NO TB");console.log("url:",(await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.id===r.targetId).url.slice(0,160));L.cdp.close();process.exit(1);}
console.log("TB:",tb.url.slice(70,160));
const raw=async e=>{const rr=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);return rr.result?.value;};
for(let k=0;k<8;k++){const n=await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`).catch(()=>0);if(n>0){console.log("blocks:",n);break;}await sleep(1500);}
const lens=await raw(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`);
console.log("LENS:",JSON.stringify(lens));
L.cdp.close();
