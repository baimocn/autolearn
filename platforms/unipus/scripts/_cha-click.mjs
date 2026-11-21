import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 点卡片中心（视觉坐标 597,565）
await mouse(597,565);
await sleep(4000);
// dump 所有帧的弹窗按钮
for(const f of await L.frames()){
  const b=await ev(`(()=>{const out=[];[...document.querySelectorAll('button,div,span,a')].forEach(e=>{if(e.children.length>1)return;const t=(e.innerText||'').replace(/\s+/g,'').trim();if(t&&t.length<12&&e.getBoundingClientRect().width>15){const bb=e.getBoundingClientRect();if(bb.top>150&&bb.top<window.innerHeight)out.push({t,x:Math.round(bb.left+bb.width/2),y:Math.round(bb.top+bb.height/2)});}});return out.filter(x=>/挑战|答题|知道|确定|开始/.test(x.t)).slice(0,10);})()`,f.ctx).catch(()=>null);
  if(b&&b.length)console.log("BTNS@",f.url.slice(40,66),"=>",JSON.stringify(b));
}
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("cha-c2.png",Buffer.from(data,"base64"));
console.log("shot cha-c2.png");
L.cdp.close();
