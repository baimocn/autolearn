import { ensureReader } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:""};return r.result?.value;};
// tree root area: look for unit selector / dropdown near i-tree-menu
const root=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('[class*=i-tree-menu]')].forEach(e=>{
    if(e.className.toString().includes('i-tree-menu ')||/i-tree-menu_[a-z]+$/.test(e.className.toString())||e.className.toString().split(' ').length===1){
      out.push({cls:e.className.toString().slice(0,40),t:(e.innerText||'').replace(/\s+/g,' ').slice(0,50)});
    }
  });
  return out.slice(0,10);})()`);
console.log("ROOTS:",JSON.stringify(root,null,1));
// any element with Unit 2 text in tree area
const u2=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('[class*=tree] *')].forEach(e=>{
    const t=(e.innerText||'').replace(/\s+/g,' ').trim();
    if(/^Unit [2-8]/.test(t)&&t.length<50){
      const rk=Object.keys(e).find(k=>k.startsWith('__reactProps'));
      const b=e.getBoundingClientRect();
      out.push({t:t.slice(0,30),cls:(typeof e.className==='string'?e.className:'').slice(0,36),click:rk?!!e[rk].onClick:null,y:Math.round(b.top)});
    }
  });
  return out.slice(0,10);})()`);
console.log("UNIT2+ IN TREE:",JSON.stringify(u2,null,1));
L.cdp.close();
