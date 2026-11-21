import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl0=await L.frames();
const tb=fl0.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:""};return r.result?.value;};
const hashOf=async()=>{const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();return tabs.find(t=>/ucontent/.test(t.url)).url.split("#")[1];};
console.log("hash before:", await hashOf());
// click section title "Unlocking the topic"
const c=await ev(`(()=>{
  const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>(e.innerText||'').replace(/\s+/g,' ').includes('Unlocking the topic'));
  if(!el)return null;
  const rk=Object.keys(el).find(k=>k.startsWith('__reactProps'));
  if(rk&&el[rk].onClick){el[rk].onClick({stopPropagation(){},preventDefault(){},target:el,currentTarget:el,nativeEvent:{}});return 'react';}
  el.click();return 'dom';})()`);
console.log("clicked:",c);
await sleep(5000);
console.log("hash after:", await hashOf());
// which blocks render now?
const lens=await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`);
console.log("lens:",JSON.stringify(lens));
L.cdp.close();
