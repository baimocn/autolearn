import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const raw=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:""};return r.result?.value;};
const hashOf=async()=>{const t=await(await fetch("http://127.0.0.1:9222/json/list")).json();return (t.find(x=>/ucontent/.test(x.url)).url.split("#")[1]||"").slice(-40);};
console.log("hash0:",await hashOf());
const click=async(name)=>{
  return raw(`(()=>{
    const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>(e.innerText||'').replace(/\s+/g,' ').includes(${JSON.stringify(name)}));
    if(!el)return 0;
    const rk=Object.keys(el).find(k=>k.startsWith('__reactProps'));
    if(rk&&el[rk].onClick){el[rk].onClick({stopPropagation(){},preventDefault(){},target:el,currentTarget:el,nativeEvent:{}});return 1;}
    el.click();return 1;})()`);
};
const r1=await click("Setting the  cene") || await click("Setting the scene");
await sleep(4000);
console.log("click1:",r1,"hash1:",await hashOf());
let lens=await raw(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`);
console.log("lens1:",JSON.stringify(lens));
// second click (if first collapsed)
const r2=await click("Setting the  cene") || await click("Setting the scene");
await sleep(4000);
console.log("click2:",r2,"hash2:",await hashOf());
lens=await raw(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`);
console.log("lens2:",JSON.stringify(lens));
L.cdp.close();
