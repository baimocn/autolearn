import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<25&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text).slice(0,200)};return r.result?.value;};
await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6].scrollIntoView({block:'center'})`);
await sleep(1500);
const h=await ev(`(()=>{
 const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];
 const cn=e=>(typeof e.className==='string'?e.className:(e.className&&e.className.baseVal)||'').toString();
 function tree(e,d){if(d>5)return null;return{tag:e.tagName,cls:cn(e).slice(0,46),tlen:(e.innerText||'').length,
   kids:[...e.children].slice(0,6).map(c=>tree(c,d+1)).filter(Boolean)};}
 return tree(b,0);
})()`);
console.log(JSON.stringify(h,null,1).slice(0,2600));
// is there a collapsed/fold? click question header to expand?
const fold=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];
 return [...b.querySelectorAll('[class*=fold],[class*=collapse],[class*=expand],[class*=header],[class*=title]')].map(e=>({c:e.className.toString().slice(0,40),t:(e.innerText||'').slice(0,20)})).slice(0,10);})()`);
console.log("FOLD:",JSON.stringify(fold,null,1));
L.cdp.close();
