import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async(e)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);return r.result?.value;};
const rows=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].forEach(e=>{
    const t=(e.innerText||'').replace(/\s+/g,' ').trim();
    if(!t||t.length>60)return;
    const row=e.closest('[class*=i-tree-menu_expanded]')||e.parentElement;
    // find status icons within the row
    const icons=[...(row?row.querySelectorAll('svg,img,i'):[])].map(x=>(x.className&&x.className.baseVal!==undefined?x.className.baseVal:(x.className||'')).toString()).slice(0,6);
    out.push({t:t.slice(0,44), icons});
  });
  return out.slice(0,50);})()`);
console.log(JSON.stringify(rows,null,1).slice(0,4000));
L.cdp.close();
