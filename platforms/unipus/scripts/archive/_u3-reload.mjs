import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
await L.cdp.send("Page.reload",{},L.sessionId).catch(()=>{});
await sleep(25000);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
let tb=null;
for(let k=0;k<20&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);if(!tb)await sleep(1000);}
const lens=await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`,tb.ctx).catch(()=>[]);
console.log("chapter:",tb?tb.url.slice(73,110):"none");
console.log("blocks:",(lens||[]).length,"rendered:",(lens||[]).filter(x=>x>80).length);
L.cdp.close();
