import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:""};return r.result?.value;};
// find expanded section containers and list their child rows
const rows=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('[class*=i-tree-menu_expanded]')].forEach(box=>{
    [...box.querySelectorAll('*')].forEach(e=>{
      const t=(e.innerText||'').replace(/\s+/g,' ').trim();
      if(!t||t.length>44)return;
      if(e.children.length>3)return;
      const rk=Object.keys(e).find(k=>k.startsWith('__reactProps'));
      out.push({t:t.slice(0,32),cls:(typeof e.className==='string'?e.className:'').slice(0,40),kids:e.children.length,click:rk?!!e[rk].onClick:null,tag:e.tagName});
    });
  });
  return out.slice(0,50);})()`);
console.log(JSON.stringify(rows,null,1).slice(0,3500));
L.cdp.close();
