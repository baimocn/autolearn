import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<20&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:r.exceptionDetails.text};return r.result?.value;};
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
await sleep(500);
const s=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
 return {score:(b.innerText.match(/得分[:：]?\s*(\d+(\.\d+)?)/)||[])[1]||null,
  ibtns:[...b.querySelectorAll('[class*=i-button]')].map(e=>(e.innerText||'').replace(/\s+/g,'')).filter(Boolean),
  txt:(b.innerText||'').replace(/\s+/g,' ').slice(0,260),
  inputs:b.querySelectorAll('input').length,
  dig:b.querySelectorAll('[class*=digEmpty],[class*=editor-dig]').length};})()`);
console.log(JSON.stringify(s,null,1));
// dialogs in frame
const d=await ev(`[...document.querySelectorAll('[class*=modal],[class*=dialog],[role=dialog]')].filter(e=>e.getBoundingClientRect().height>80).map(e=>(e.innerText||'').replace(/\s+/g,' ').slice(0,150))`);
console.log("DLG:",JSON.stringify(d));
L.cdp.close();
