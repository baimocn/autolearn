import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 点我知道了
await mouse(629,458);
await sleep(2000);
// 开抽屉→可能已开；找挑战卡并 JS 点击
let tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
const c=await ev(`(()=>{
  const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
  for(const c2 of cs){
    const img=c2.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
    if(dec.includes('挑战')){(img||c2).click();return 1;}
  }
  return 0;})()`,tb.ctx).catch(()=>0);
console.log("card click:",c);
await sleep(5000);
// dump 弹窗按钮
for(const f of await L.frames()){
  const b=await ev(`(()=>{const out=[];[...document.querySelectorAll('button,div,span,a')].forEach(e=>{if(e.children.length>1)return;const t=(e.innerText||'').replace(/\s+/g,'').trim();const bb=e.getBoundingClientRect();if(t&&t.length<10&&bb.width>15)out.push({t,x:Math.round(bb.left+bb.width/2),y:Math.round(bb.top+bb.height/2)});});return out.filter(x=>/挑战|成绩|提交|继续|知道/.test(x.t)).slice(0,10);})()`,f.ctx).catch(()=>null);
  if(b&&b.length)console.log("BTNS@",f.url.slice(40,64),"=>",JSON.stringify(b));
}
// 若出现 成绩提交 直接点
for(const f of await L.frames()){
  const r=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
  if(r){console.log("成绩提交 clicked");break;}
}
await sleep(2500);
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("u3-score2.png",Buffer.from(data,"base64"));
L.cdp.close();
