import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const raw=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:""};return r.result?.value;};
// expand Setting the scene: click its title
const c=await raw(`(()=>{
  const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>(e.innerText||'').replace(/\s+/g,' ').includes('Setting the  cene'));
  if(!el)return 0;
  const rk=Object.keys(el).find(k=>k.startsWith('__reactProps'));
  if(rk&&el[rk].onClick){el[rk].onClick({stopPropagation(){},preventDefault(){},target:el,currentTarget:el,nativeEvent:{}});return 1;}
  el.click();return 1;})()`);
await sleep(4000);
console.log("clicked:",c);
// dump expanded section subtree text rows
const rows=await raw(`(()=>{
  const li=[...document.querySelectorAll('[class*=i-tree-menu_expanded]')].find(e=>(e.innerText||'').includes('Setting the  cene'));
  if(!li)return null;
  const out=[];
  const walk=(e,d)=>{ if(d>6)return;
    [...e.children].forEach(ch=>{
      const t=(ch.innerText||'').replace(/\s+/g,' ').trim();
      out.push({d,tag:ch.tagName,cls:(typeof ch.className==='string'?ch.className:'').slice(0,34),t:t.slice(0,30),kids:ch.children.length});
      walk(ch,d+1);
    });
  };
  walk(li,0);
  return out.slice(0,60);})()`);
console.log(JSON.stringify(rows,null,1).slice(0,3500));
L.cdp.close();
