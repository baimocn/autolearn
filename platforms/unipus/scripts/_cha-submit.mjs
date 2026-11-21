import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const ex=(await L.frames()).find(f=>/\/exam\//.test(f.url)&&f.ctx);
const picks=[2,1,3,2,1]; // C B D C B
const r=await ev(`(async()=>{
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  const picks=${JSON.stringify(picks)};
  const out=[];
  for(let i=0;i<items.length;i++){
    const rows=[...items[i].querySelectorAll('[class*=chioceView_strongListView]')];
    const idx=picks[i]??0;
    if(rows[idx]){ rows[idx].click(); out.push(i+":"+(idx)); }
    await new Promise(r2=>setTimeout(r2,180));
  }
  return out;
})()`,ex.ctx);
console.log("picked:",JSON.stringify(r));
await sleep(1200);
// 提交
let sub=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>10);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx);
console.log("submit:",sub);
await sleep(3000);
for(let k=0;k<6;k++){
  let hit=false;
  for(const f of await L.frames()){
    const r2=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确定|确认)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>0);
    if(r2){hit=true;break;}
  }
  if(!hit)break;
  await sleep(1800);
}
await sleep(4000);
let sc=false;
for(let k=0;k<8;k++){
  let hit=false;
  for(const f of await L.frames()){
    const r3=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>0);
    if(r3){console.log("成绩提交 clicked");sc=true;hit=true;break;}
  }
  if(hit)break;
  await sleep(1500);
}
console.log("scored:",sc);
for(const f of await L.frames()){
  const t=await ev(`(()=>{const d=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=result]')].find(e=>e.getBoundingClientRect().height>60);return d?d.innerText.replace(/\s+/g,' ').slice(0,220):'';})()`,f.ctx).catch(()=>"");
  if(t&&t.length>8)console.log("RESULT:",t);
}
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("cha-u1-result.png",Buffer.from(data,"base64"));
L.cdp.close();
