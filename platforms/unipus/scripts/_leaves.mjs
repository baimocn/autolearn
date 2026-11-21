import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:""};return r.result?.value;};
const leaves=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('[class*=i-tree-menu] *')].forEach(e=>{
    const rk=Object.keys(e).find(k=>k.startsWith('__reactProps'));
    if(!rk||!e[rk].onClick)return;
    const t=(e.innerText||'').replace(/\s+/g,' ').trim();
    if(!t||t.length>44)return;
    const cls=(typeof e.className==='string'?e.className:'');
    out.push({t:t.slice(0,30),cls:cls.slice(0,36),kids:e.children.length});
  });
  return out.slice(0,80);})()`);
console.log(JSON.stringify(leaves,null,1).slice(0,4000));
L.cdp.close();
