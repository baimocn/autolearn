import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<20&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:r.exceptionDetails.text,r:r.exceptionDetails};return r.result?.value;};
// scroll whole page, trigger lazy
await ev(`(()=>{const sc=document.scrollingElement;
 const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
 let t=b; for(let i=0;i<8;i++){t=t.parentElement; if(!t)break; t.scrollTop=t.scrollHeight;}
 sc.scrollTop=sc.scrollHeight; b.scrollIntoView({block:'start'});
 return 1;})()`);
await sleep(2500);
// structural outline of block: child divs with class + text length
const struct=await ev(`(()=>{
 const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
 function tree(e,d){
   if(d>4)return null;
   return {cls:(e.className||'').toString().slice(0,42), tlen:(e.innerText||'').length, disp:getComputedStyle(e).display,
     kids:[...e.children].slice(0,8).map(c=>tree(c,d+1)).filter(Boolean)};
 }
 return tree(b,0);
})()`);
console.log(JSON.stringify(struct,null,1).slice(0,3000));
L.cdp.close();
