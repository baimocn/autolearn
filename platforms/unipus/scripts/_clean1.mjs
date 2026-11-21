import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<25&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:r.exceptionDetails.text};return r.result?.value;};
// wait for block1 to fully render (preview blanks)
let s0=null;
for(let w=0;w<12;w++){await sleep(1500);
  s0=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
   return {len:(b.innerText||'').length, preview:b.querySelectorAll('[class*=digEmptyView_blankView]').length,
    score:(b.innerText.match(/得分[:：]?\s*(\d+(\.\d+)?)/)||[])[1]||null};})()`);
  if(s0.preview>0)break;}
console.log("PREVIEW READY:",JSON.stringify(s0));
// ONE clean redo
const clicked=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
 const el=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>(e.innerText||'').replace(/\s+/g,'')==='重新作答');
 if(!el)return 0; el.click();return 1;})()`);
console.log("redo clicked:",clicked);
// poll for EDIT blanks
for(let w=0;w<10;w++){await sleep(1000);
 const s=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
  return {trigger:b.querySelectorAll('[class*=digEmptyView_selectTrigger]').length,
   blanks:b.querySelectorAll('[class*=digEmptyView_blankView]').length,
   place:b.querySelectorAll('[class*=placeholder]').length,
   allDig:new Set([...b.querySelectorAll('[class*=digEmptyView]')].map(e=>e.className.toString().split(' ')[0])).size,
   len:(b.innerText||'').length};})()`);
 console.log("edit t+"+(w+1)+"s",JSON.stringify(s));
 if(s.trigger>0)break;
}
L.cdp.close();
