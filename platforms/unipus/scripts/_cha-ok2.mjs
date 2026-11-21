import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
// 找"你已完成本轮全部挑战"弹窗，JS 点其确定
let found=false;
for(const f of await L.frames()){
  const r=await ev(`(()=>{
    const all=[...document.querySelectorAll('*')];
    const holder=all.find(e=>(e.innerText||'').includes('你已完成本轮全部挑战')&&e.children.length>=1&&e.getBoundingClientRect().height>60&&e.getBoundingClientRect().height<400);
    if(!holder)return 0;
    const btns=[...holder.querySelectorAll('button,div,span')].filter(e=>(e.innerText||'').replace(/\s+/g,'')==='确定');
    if(!btns.length)return 0;
    btns[btns.length-1].click();
    return 1;
  })()`,f.ctx).catch(()=>0);
  if(r){console.log("JS clicked 确定 @",f.url.slice(40,60));found=true;break;}
}
console.log("found:",found);
await sleep(4500);
// 成绩提交
let posted=false;
for(let k=0;k<10;k++){
  for(const f of await L.frames()){
    const r=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
    if(r){console.log("成绩提交 JS clicked @",f.url.slice(40,60));posted=true;break;}
  }
  if(posted)break;
  await sleep(1500);
}
console.log("posted:",posted);
await sleep(4000);
// dump 弹窗
for(const f of await L.frames()){
  const t=await ev(`(()=>{const d=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=result],[class*=popup]')].find(e=>{const b=e.getBoundingClientRect();return b.height>80&&b.width>200;});
    return d?d.innerText.replace(/\s+/g,' ').slice(0,200):'';})()`,f.ctx).catch(()=>"");
  if(t&&t.length>10)console.log("DLG:",t);
}
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("cha-u1-done2.png",Buffer.from(data,"base64"));
L.cdp.close();
