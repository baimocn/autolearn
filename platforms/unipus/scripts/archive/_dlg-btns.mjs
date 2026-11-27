import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
for(const f of await L.frames()){
  const info=await ev(`(()=>{
    const dlg=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=popup],[class*=result]')].find(e=>e.getBoundingClientRect().height>100&&/挑战|成绩/.test(e.innerText||''));
    if(!dlg)return null;
    const btns=[...dlg.querySelectorAll('button,[class*=i-button],[class*=btn]')].map(b=>({t:(b.innerText||'').replace(/\s+/g,'').slice(0,14),w:Math.round(b.getBoundingClientRect().width)})).filter(x=>x.t);
    return {txt:(dlg.innerText||'').replace(/\s+/g,' ').slice(0,100), btns:btns.slice(0,8)};
  })()`,f.ctx).catch(()=>null);
  if(info)console.log("FRAME",f.url.slice(38,64),"=>",JSON.stringify(info));
}
L.cdp.close();
