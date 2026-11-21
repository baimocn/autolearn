import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const ex=(await L.frames()).find(f=>/\/exam\//.test(f.url)&&f.ctx);
if(!ex){console.log("NO EXAM");process.exit(0);}
const info=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];return items.map((q,i)=>({i,stem:(q.innerText||'').replace(/\s+/g,' ').slice(0,240)}));})()`,ex.ctx);
console.log(JSON.stringify(info,null,1).slice(0,3000));
L.cdp.close();
