import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 关 100 分弹窗 X (CSS 964,158)
await mouse(964,158);
await sleep(1500);
// 打开抽屉
let tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
const op=await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
if(op){await mouse(op.x,op.y);await sleep(2500);}
else {await mouse(22,183);await sleep(2500);}
// 找 Unit 3 标题并点击（滚到顶部）
await ev(`(()=>{const sc=document.querySelector('[class*=i-tree-menu_tree-menu]');if(sc)sc.scrollTop=0;return 1;})()`,tb.ctx).catch(()=>{});
await sleep(800);
const u3=await ev(`(()=>{const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>{const t=(e.innerText||'').replace(/\s+/g,'');return t.startsWith('Unit3');});if(!el)return null;const b=el.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
console.log("u3 title:",JSON.stringify(u3));
if(u3){await mouse(u3.x,u3.y);await sleep(7000);}
// 关抽屉
for(let k=0;k<2;k++){
  const dp=await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
  if(!dp)break;
  await mouse(dp.x,dp.y);await sleep(1000);
}
await sleep(3000);
// 现在的 hash 和章节
const hash=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.id===rd.id).url.split("#")[1]||"";
console.log("hash:",hash.slice(-50));
tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
console.log("chapter:",tb?tb.url.slice(70,140):"none");
const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0);
console.log("blocks:",n);
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("nav-u3.png",Buffer.from(data,"base64"));
L.cdp.close();
