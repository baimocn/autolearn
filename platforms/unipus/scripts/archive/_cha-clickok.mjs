import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
await mouse(712,525);
console.log("clicked 712,525");
await sleep(4000);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
// 检查弹窗是否消失 + 找成绩提交
for(const f of await L.frames()){
  const t=await ev(`(()=>{const b=document.body;return b?(b.innerText||'').replace(/\s+/g,' ').slice(0,300):'';})()`,f.ctx).catch(()=>"");
  if(t&&/成绩提交|本轮成绩|挑战|确定要提交/.test(t))console.log("FRAME",f.url.slice(40,60),"TXT:",t.slice(0,200));
}
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("cha-clickok.png",Buffer.from(data,"base64"));
L.cdp.close();
