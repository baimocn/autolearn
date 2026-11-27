import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const ex=(await L.frames()).find(f=>/\/exam\//.test(f.url)&&f.ctx);
const info=await ev(`(()=>{
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  const q=items[4];
  if(!q)return "no q5";
  return {stem:(q.innerText||'').replace(/\s+/g,' ').slice(0,220)};
})()`,ex.ctx);
console.log("Q5:",JSON.stringify(info));
L.cdp.close();
