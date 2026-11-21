import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
let posted=false;
for(let k=0;k<12;k++){
  for(const f of await L.frames()){
    const r=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
    if(r){console.log("成绩提交 clicked @",f.url.slice(40,60),"try",k);posted=true;break;}
  }
  if(posted)break;
  await sleep(2000);
}
console.log("posted:",posted);
await sleep(3000);
for(const f of await L.frames()){
  const t=await ev(`(()=>{const t2=document.body.innerText;const m=t2.replace(/\s+/g,' ').match(/(提交成功|本轮成绩)[^。]{0,50}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
  if(t)console.log("RESULT:",t);
}
L.cdp.close();
