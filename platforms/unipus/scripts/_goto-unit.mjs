import { connect, sleep } from "./utlib.mjs";
const U=process.argv[2]||4;
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 清弹窗
for(let k=0;k<3;k++){await mouse(629,458);await sleep(1200);}
// 开抽屉
let tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
for(let i=0;i<3;i++){
  const opened=await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return 0;const b=e.getBoundingClientRect();return b.width>3?1:0;})()`,tb.ctx).catch(()=>0);
  if(opened)break;
  const op=await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
  if(op)await mouse(op.x,op.y);else await mouse(22,183);
  await sleep(2200);
}
await ev(`(()=>{const sc=document.querySelector('[class*=i-tree-menu_tree-menu]');if(sc)sc.scrollTop=0;return 1;})()`,tb.ctx).catch(()=>{});
await sleep(600);
const t=await ev(`(()=>{const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>{const x=(e.innerText||'').replace(/\s+/g,'');return x.startsWith('Unit${U}')||x.startsWith('Unit ${U}');});if(!el)return null;const b=el.getBoundingClientRect();if(b.top<0||b.top>window.innerHeight-20)return {out:1,y:Math.round(b.top)};return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
console.log("unit title:",JSON.stringify(t));
if(t&&t.x){await mouse(t.x,t.y);await sleep(7000);}
// 关抽屉
for(let k=0;k<2;k++){
  const dp=await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
  if(!dp)break;
  await mouse(dp.x,dp.y);await sleep(1000);
}
await sleep(3000);
tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
console.log("chapter:",tb?tb.url.slice(73,120):"none");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync(`goto-u${U}.png`,Buffer.from(data,"base64"));
L.cdp.close();
