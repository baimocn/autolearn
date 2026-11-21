import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const ex=(await L.frames()).find(f=>/\/exam\//.test(f.url)&&f.ctx);
const html=await ev(`(()=>{
  const modals=[...document.querySelectorAll('.ant-modal-wrap,[class*=modal]')];
  const holder=modals.find(m=>/你已完成本轮全部挑战/.test(m.innerText||''));
  if(!holder)return 'NO';
  return holder.outerHTML.slice(-2500);
})()`,ex.ctx);
console.log(html);
L.cdp.close();
