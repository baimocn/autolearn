import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 关抽屉（DOM 找 drawer-close；找不到用视觉坐标 390,27）
let tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
let closed=await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return 0;const b=e.getBoundingClientRect();if(b.width<3)return 0;const rk=Object.keys(e).find(k=>k.startsWith('__reactProps'));try{if(rk&&e[rk].onClick)e[rk].onClick({stopPropagation(){},preventDefault(){},target:e,currentTarget:e,nativeEvent:{}});else e.click();}catch(err){e.click();}return 1;})()`,tb.ctx).catch(()=>0);
console.log("drawer close (DOM):",closed);
if(!closed){await mouse(390,27);console.log("drawer close (vision 390,27)");}
await sleep(2000);
// 重查渲染
const lens=await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`,tb.ctx).catch(()=>[]);
console.log("LENS:",JSON.stringify(lens));
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("u1-clean.png",Buffer.from(data,"base64"));
L.cdp.close();
