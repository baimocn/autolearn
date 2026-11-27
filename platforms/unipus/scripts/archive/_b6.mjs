import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<25&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text).slice(0,200)};return r.result?.value;};
// scroll block6 thoroughly
for(let k=0;k<8;k++){await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];if(b)b.scrollIntoView({block:'center'});return 1;})()`);await sleep(700);
 const n=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];return {inp:b.querySelectorAll('input').length, inpt:b.querySelectorAll('input[type=text]').length, len:(b.innerText||'').length};})()`);
 if(n.inpt>0){console.log("READY@",k,JSON.stringify(n));break;}
 if(k===7)console.log("FINAL",JSON.stringify(n));
}
const d=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];return (b.innerText||'').replace(/\s+/g,' ').slice(0,400);})()`);
console.log("TEXT:",d);
const cls=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];
 return [...new Set([...b.querySelectorAll('input')].map(e=>e.type+':'+(e.className||'').toString().slice(0,30)))].slice(0,12);})()`);
console.log("INPUTS:",JSON.stringify(cls));
L.cdp.close();
