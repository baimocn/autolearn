import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 点确定
await mouse(965,712);
await sleep(4000);
// 找成绩提交按钮（真实坐标）
let posted=false;
for(let k=0;k<10;k++){
  for(const f of await L.frames()){
    const p=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);
    if(p){await mouse(p.x,p.y);console.log("成绩提交 @",p.x,p.y,f.url.slice(40,60));posted=true;break;}
  }
  if(posted)break;
  await sleep(1500);
}
console.log("posted:",posted);
await sleep(4000);
// 结果文本
for(const f of await L.frames()){
  const t=await ev(`(()=>{const d=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=result],[class*=popup]')].find(e=>{const b=e.getBoundingClientRect();return b.height>100&&b.width>300;});
    return d?d.innerText.replace(/\s+/g,' ').slice(0,260):'';})()`,f.ctx).catch(()=>"");
  if(t&&t.length>10)console.log("RESULT:",t);
}
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("cha-u1-done.png",Buffer.from(data,"base64"));
L.cdp.close();
