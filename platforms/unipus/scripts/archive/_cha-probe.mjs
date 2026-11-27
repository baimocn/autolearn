import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx||tb.ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 找挑战卡并滚到中心
const card=await ev(`(()=>{
  const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
  for(const c of cs){const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
    if(dec.includes('挑战')){c.scrollIntoView({block:'center'});const b=c.getBoundingClientRect();
      return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),top:Math.round(b.top),h:Math.round(b.height)};}}
  return null;})()`);
console.log("card:",JSON.stringify(card));
await sleep(1500);
// 点卡片中心
await mouse(card.x,card.y);
await sleep(4500);
// dump 所有帧里的可见文本按钮
for(const f of await L.frames()){
  const btns=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const out=[];[...document.querySelectorAll('button,div,span,a')].forEach(e=>{if(e.children.length>1)return;const t=(e.innerText||'').replace(/\s+/g,'').trim();const b=e.getBoundingClientRect();if(t&&t.length<10&&b.width>20&&b.height>16)out.push({t,x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)});});return out.slice(0,25);})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>null);
  if(btns&&btns.length)console.log("FRAME",f.url.slice(0,55),"=>",JSON.stringify(btns));
}
// 截图
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("cha-probe.png",Buffer.from(data,"base64"));
console.log("shot saved");
L.cdp.close();
