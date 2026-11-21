import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);return r.result?.value;};
console.log("reader hash:", await (await fetch("http://127.0.0.1:9222/json/list")).json().then(a=>a.find(t=>/ucontent/.test(t.url)).url.split("#")[1]));
for(let i=0;i<12;i++){
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
  await sleep(700);
  const l=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return b?(b.innerText||'').length:-1;})()`);
  console.log(`#${i} len=${l}`);
}
L.cdp.close();
