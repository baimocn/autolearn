import { ensureReader } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:""};return r.result?.value;};
// find triggers containing 学习记录
const trg=await ev(`[...document.querySelectorAll('button,div,span,a')].filter(e=>{
  const t=(e.innerText||'').replace(/\s+/g,' ').trim();
  return /学习记录|学习进度|单元报告/.test(t)&&t.length<12&&e.getBoundingClientRect().width>0&&e.children.length<=2;
}).map(e=>({t:e.innerText.trim(),cls:(e.className||'').toString().slice(0,40),rk:!!Object.keys(e).find(k=>k.startsWith('__reactProps'))})).slice(0,10)`);
console.log("TRIGGERS:",JSON.stringify(trg,null,1));
L.cdp.close();
