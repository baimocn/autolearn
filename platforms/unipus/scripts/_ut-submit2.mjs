import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 答题卡【提交】按钮（真鼠标，坐标 1131,766）
await mouse(1131,766);
await sleep(3000);
// 确认（ant-btn-primary，各帧）
let conf=0;
for(const f of await L.frames()){
  conf=await ev(`(()=>{const b=document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');if(!b)return 0;b.click();return 1;})()`,f.ctx).catch(()=>0);
  if(conf){console.log("confirm @",f.url.slice(40,60));break;}
}
console.log("confirm:",conf);
await sleep(5000);
// 成绩提交
let posted=false;
for(let k=0;k<10;k++){
  for(const f of await L.frames()){
    const rr=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(成绩提交|提交成绩)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
    if(rr){console.log("成绩提交 clicked @",f.url.slice(40,60));posted=true;break;}
  }
  if(posted)break;
  await sleep(1500);
}
console.log("posted:",posted);
await sleep(3000);
for(const f of await L.frames()){
  const t=await ev(`(()=>{const t2=document.body.innerText;const m=t2.replace(/\s+/g,' ').match(/(本轮成绩|最终得分|提交成功|成绩提交成功|你的最终得分)[^。]{0,60}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
  if(t)console.log("RESULT:",t);
}
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("u2-ut-final2.png",Buffer.from(data,"base64"));
L.cdp.close();
