import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<25&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:r.exceptionDetails.text};return r.result?.value;};
for(let k=0;k<12;k++){
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];b.scrollIntoView({block:'center'});return 1;})()`);
  await sleep(1200);
  const s=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];
    return {all:b.querySelectorAll('input').length,txt:b.querySelectorAll('input[type=text]').length,len:(b.innerText||'').length,t:(b.innerText||'').replace(/\s+/g,' ').slice(0,60)};})()`);
  console.log(k,JSON.stringify(s));
  if(s.txt>0)break;
}
L.cdp.close();
