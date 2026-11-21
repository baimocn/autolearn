import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<20&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:r.exceptionDetails.text};return r.result?.value;};
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
await sleep(400);
// click redo if present
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
 const el=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>(e.innerText||'').replace(/\s+/g,'')==='重新作答');
 if(el)el.click();return !!el;})()`);
await sleep(2200);
const info=await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
  const digs=[...new Set([...b.querySelectorAll('[class*=digEmpty],[class*=dig]')].map(e=>e.className.toString().split(' ')[0]))].slice(0,30);
  const blanks=[...b.querySelectorAll('[class*=blankView],[class*=editor-dig-empty]')].slice(0,12).map(e=>({cls:e.className.toString().slice(0,50),txt:(e.innerText||'').slice(0,24)}));
  const trigs=[...b.querySelectorAll('[class*=selectTrigger],[class*=Trigger]')].length;
  return {digs, blankN:blanks.length, blanks, trigs};
})()`);
console.log(JSON.stringify(info,null,1));
L.cdp.close();
