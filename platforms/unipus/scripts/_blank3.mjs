import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
await L.cdp.send("Page.reload",{},L.sessionId);
let tb=null;
for(let k=0;k<30;k++){await sleep(1000);
  tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));
  if(tb){const bv=await L.ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1].querySelectorAll('[class*=digEmptyView_blankView]').length`,tb.ctx).catch(()=>0);
    if(bv>=10)break;}
}
const cn=e=>(typeof e.className==='string'?e.className:(e.className&&e.className.baseVal)||'');
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text).slice(0,300)};return r.result?.value;};
await ev(`(()=>{[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1].scrollIntoView({block:'center'});return 1;})()`);
await sleep(1000);
// click first blank via React onClick
const clickRes=await ev(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
  const blanks=[...b.querySelectorAll('[class*=digEmptyView_blankView]')];
  const bl0=blanks[0]; if(!bl0)return{none:1};
  const rk=Object.keys(bl0).find(k=>k.startsWith('__reactProps'));
  if(rk&&bl0[rk].onClick)bl0[rk].onClick({stopPropagation(){},preventDefault(){},target:bl0,currentTarget:bl0,nativeEvent:{}});
  else bl0.click();
  await new Promise(r=>setTimeout(r,700));
  // popup options anywhere in frame
  const opts=[...document.querySelectorAll('[class*=optionItem],[class*=selectOption],[class*=popover],[class*=popup] *')]
    .map(e=>({c:${'cn'}(e),t:(e.innerText||'').trim()})).filter(x=>x.t&&x.t.length<40&&x.t.length>1&&/[a-zA-Z]{3}/.test(x.t));
  const uniq=[...new Map(opts.map(o=>[o.c+o.t,o])).values()].slice(0,20);
  return {nBlanks:blanks.length, blankTxt:(bl0.innerText||'').slice(0,20), popup:uniq};
})()`);
console.log(JSON.stringify(clickRes,null,1));
L.cdp.close();
