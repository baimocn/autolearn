import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
for(const f of await L.frames()){
  const info=await ev(`(()=>{
    const out=[];
    [...document.querySelectorAll('button,div,span')].forEach(e=>{
      const t=(e.innerText||'').replace(/\s+/g,'');
      if(/^(确定|取消)$/.test(t)&&e.children.length<=1){
        const b=e.getBoundingClientRect();
        const rk=Object.keys(e).find(k=>k.startsWith('__reactProps'));
        out.push({t,w:Math.round(b.width),h:Math.round(b.height),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),vis:b.width>0&&b.height>0,hasClick:!!(rk&&e[rk].onClick)});
      }
    });
    return out;
  })()`,f.ctx).catch(()=>null);
  if(info&&info.length)console.log("FRAME",f.url.slice(40,62),"=>",JSON.stringify(info));
}
L.cdp.close();
