import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const fl=await L.frames();
for(const f of fl){
  const r=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const out=[];[...document.querySelectorAll('*')].forEach(e=>{if(e.children.length)return;const t=(e.textContent||'').trim();if(/^\d+(\.\d+)?%$/.test(t)){const b=e.getBoundingClientRect();if(b.width>0)out.push({t,cls:(typeof e.className==='string'?e.className:'').slice(0,40),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)});}});return out.slice(0,20);})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).catch(()=>({}));
  const v=r.result?.value;
  if(v&&v.length)console.log("FRAME",f.url.slice(0,55),"=>",JSON.stringify(v));
}
L.cdp.close();
