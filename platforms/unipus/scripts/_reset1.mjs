import { ensureReader, READER, COURSE, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<25&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
// Full reload via session to reset
await L.cdp.send("Page.reload",{},L.sessionId);
for(let k=0;k<25;k++){await sleep(1000);
  const f=(await L.frames()).find(x=>x.url.includes("textbook/book")&&x.ctx&&x.url.includes(CH[1].slice(0,12)));
  if(f){const n=await L.ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,f.ctx).catch(()=>0);if(n>=27){tb=f;break;}}
}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:r.exceptionDetails.text};return r.result?.value;};
// block1 reset state
const s0=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
 return {score:(b.innerText.match(/得分[:：]?\s*(\d+(\.\d+)?)/)||[])[1], txt:(b.innerText||'').replace(/\s+/g,' ').slice(0,120), dig:b.querySelectorAll('[class*=digEmptyView_blankView]').length};})()`);
console.log("AFTER RESET:",JSON.stringify(s0,null,1));
L.cdp.close();
