import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||"").slice(0,150)};return r.result?.value;};
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
await sleep(1000);
const s=await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];
  const t=(b.innerText||'');
  return {len:t.length, txt:t.replace(/\s+/g,' ').slice(0,420),
    inpVals:[...b.querySelectorAll('input[type=text]')].map(e=>e.value).slice(0,12),
    sub:[...b.querySelectorAll('[class*=i-button]')].map(e=>(e.innerText||'').replace(/\s+/g,'')).filter(Boolean).slice(0,6)};
})()`);
console.log(JSON.stringify(s,null,1));
L.cdp.close();
