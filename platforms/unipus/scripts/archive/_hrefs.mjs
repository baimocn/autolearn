import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:""};return r.result?.value;};
const hrefs=await ev(`[...document.querySelectorAll('[class*=i-tree-menu] a,[class*=i-tree-menu] [href]')].map(a=>({t:(a.innerText||'').replace(/\s+/g,' ').trim().slice(0,30),h:a.getAttribute('href')||''})).slice(0,60)`);
console.log(JSON.stringify(hrefs,null,1).slice(0,3000));
// also check block 7 for node id attributes
const b7=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][7];
  if(!b)return null;
  const attrs=[...b.attributes].map(a=>a.name+'='+a.value.slice(0,40));
  const rk=Object.keys(b).filter(k=>k.startsWith('__react'));
  let props=null;
  if(rk.length){const p=b[rk.find(k=>k.includes('Props'))];if(p)props=Object.keys(p).slice(0,12);}
  return {attrs,props};})()`);
console.log("B7:",JSON.stringify(b7,null,1));
L.cdp.close();
