import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
await L.cdp.send("Page.reload",{},L.sessionId);
let tb=null;
for(let k=0;k<30;k++){await sleep(1000);
  tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));
  if(tb){const n=await L.ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0);
    const bv=await L.ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1].querySelectorAll('[class*=digEmptyView_blankView]').length`,tb.ctx).catch(()=>0);
    if(n>=27&&bv>=10)break;}
}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:r.exceptionDetails.text};return r.result?.value;};
await ev(`(()=>{[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1].scrollIntoView({block:'center'});return 1;})()`);
await sleep(800);
// inspect the first blank: its inner structure / react click
const info=await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
  const blanks=[...b.querySelectorAll('[class*=digEmptyView_blankView]')];
  const bl0=blanks[0];
  const rk=Object.keys(bl0).find(k=>k.startsWith('__reactProps'));
  return {n:blanks.length, firstCls:bl0.className.toString(), firstTxt:(bl0.innerText||'').slice(0,30),
    hasClick:rk?!!bl0[rk].onClick:false, rk,
    inner:[...bl0.querySelectorAll('*')].map(e=>e.className.toString().split(' ')[0]).slice(0,8)};
})()`);
console.log("BLANK INFO:",JSON.stringify(info,null,1));
L.cdp.close();
