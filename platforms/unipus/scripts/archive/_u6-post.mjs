import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 等弹窗
for(let k=0;k<8;k++){
  let posted=false;
  for(const f of await L.frames()){
    const r=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
    if(r){console.log("成绩提交 clicked @",f.url.slice(40,60),"try",k);posted=true;break;}
  }
  if(posted){await sleep(2500);break;}
  await sleep(2000);
}
// 结果文本
for(const f of await L.frames()){
  const t=await ev(`(()=>{const t2=document.body?document.body.innerText:'';const m=t2.replace(/\s+/g,' ').match(/(本轮成绩|最终得分|提交成功)[^。]{0,60}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
  if(t)console.log("RESULT:",t);
}
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("u6-final.png",Buffer.from(data,"base64"));
L.cdp.close();
