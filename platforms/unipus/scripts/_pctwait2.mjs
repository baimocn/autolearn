import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async(e)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);return r.result?.value;};
// scroll content to trigger progress
for(let s=0;s<6;s++){
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,600);return 1;})()`).catch(()=>{});
  await new Promise(r=>setTimeout(r,1500));
}
// also click a section title (Setting the scene) to navigate
const p=await ev(`(()=>{const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>(e.innerText||'').includes('Setting the scene'));if(!el)return null;const b=el.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
console.log("section point:",JSON.stringify(p));
if(p){await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:p.x,y:p.y,button:"left",clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:p.x,y:p.y,button:"left",clickCount:1},L.sessionId);}
await new Promise(r=>setTimeout(r,8000));
for(let k=0;k<4;k++){
  const pc=await ev(`(()=>{const out=[];[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].forEach(e=>{const t=(e.innerText||'').replace(/\s+/g,' ').trim();const m=t.match(/(\d+(?:\.\d+)?)\s*%\s*$/);if(m)out.push(t);});return out.slice(0,20);})()`);
  console.log("after nav t+"+(k*5)+"s:",JSON.stringify(pc));
  if(pc&&pc.length)break;
  await new Promise(r=>setTimeout(r,5000));
}
const hash=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>/ucontent/.test(t.url)).url.split("#")[1]||"";
console.log("hash:",hash.slice(-40));
L.cdp.close();
