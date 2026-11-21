import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
await L.cdp.send("Page.reload",{},L.sessionId);
const findTb=async()=>{const fs=await L.frames();return fs.find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));};
let tb=await findTb();
const ev=async e=>{if(!tb)return null;const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text).slice(0,200)};return r.result?.value;};
let bv=0, nb=0;
for(let k=0;k<40;k++){
  await sleep(1000);
  tb=await findTb();
  nb=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`).catch(()=>0)||0;
  if(nb>1){
    // nudge block1 into viewport
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];if(b)b.scrollIntoView({block:'center'});return 1;})()`).catch(()=>0);
    await sleep(300);
    bv=await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1].querySelectorAll('[class*=digEmptyView_blankView]').length`).catch(()=>0)||0;
  }
  if(nb>=27&&bv>=8)break;
}
console.log("ready: blocks",nb,"blanks",bv);
await sleep(800);
// Now click the FIRST blank and see popup / in-place options
const res=await ev(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
  const blanks=[...b.querySelectorAll('[class*=digEmptyView_blankView]')];
  const bl0=blanks[0]; if(!bl0)return{none:1};
  const before=bl0.innerText.trim();
  const rk=Object.keys(bl0).find(k=>k.startsWith('__reactProps'));
  if(rk&&bl0[rk].onClick){bl0[rk].onClick({stopPropagation(){},preventDefault(){},target:bl0,currentTarget:bl0,nativeEvent:{}});}
  else bl0.click();
  await new Promise(r=>setTimeout(r,800));
  // capture any newly visible option popups / selects within block or document
  const pop=[...document.querySelectorAll('[class*=digEmptyView_optionItem],[class*=digEmptyView_select]')]
    .map(e=>({c:e.className.toString().split(' ')[0],t:(e.innerText||'').trim()}))
    .filter(x=>x.t&&x.t.length<40);
  return {blankCount:blanks.length, firstText:before, pop:[...new Map(pop.map(p=>[p.c+p.t,p])).values()].slice(0,25)};
})()`);
console.log("CLICK RESULT:",JSON.stringify(res,null,1));
L.cdp.close();
