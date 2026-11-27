import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<25&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text).slice(0,300)};return r.result?.value;};
// ensure clean question mode: if 重新作答 present, reload first handled externally; just read
await ev(`(()=>{[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1].scrollIntoView({block:'center'});return 1;})()`);
await sleep(800);
const info=await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
  const blanks=[...b.querySelectorAll('[class*=digEmptyView_blankView]')];
  const bl0=blanks[0]; if(!bl0)return{none:1};
  const rk=Object.keys(bl0).find(k=>k.startsWith('__reactProps'));
  const cn=e=>(typeof e.className==='string'?e.className:(e.className&&e.className.baseVal)||'').split(' ')[0];
  return {n:blanks.length,firstCls:cn(bl0),firstTxt:(bl0.innerText||'').slice(0,20),
    hasClick:rk?!!bl0[rk].onClick:false,
    inner:[...bl0.querySelectorAll('*')].map(cn).filter(Boolean).slice(0,10),
    ibtns:[...b.querySelectorAll('[class*=i-button]')].map(e=>(e.innerText||'').replace(/\s+/g,'')).filter(Boolean)};
})()`);
console.log(JSON.stringify(info,null,1));
L.cdp.close();
