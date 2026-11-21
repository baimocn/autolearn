import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<20&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:r.exceptionDetails.text};return r.result?.value;};
for(let w=0;w<5;w++){
  await sleep(2000);
  const s=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
   return {len:(b.innerText||'').length, dig:b.querySelectorAll('[class*=digEmpty],[class*=editor-dig],[class*=blankView]').length,
    allBlankish:b.querySelectorAll('[class*=dig],[class*=blank],[class*=Blank]').length, tail:(b.innerText||'').replace(/\s+/g,' ').slice(40,160)};})()`);
  console.log("t+"+((w+1)*2)+"s",JSON.stringify(s));
}
L.cdp.close();
