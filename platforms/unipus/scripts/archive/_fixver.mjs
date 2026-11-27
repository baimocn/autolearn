import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
if(!rd){console.log("NO READER TAB");process.exit(0);}
const L=await connect(rd.id);
const fl=await L.frames();
console.log("frames:",fl.length);
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 1) 找到并点击“我知道了”（所有帧）
for(let k=0;k<4;k++){
  let hit=false;
  for(const f of fl){
    const p=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>null);
    if(p){await mouse(p.x,p.y);console.log("clicked 我知道了",p.x,p.y);hit=true;break;}
  }
  if(!hit)break;
  await sleep(1500);
}
await sleep(2000);
// 2) 点击“返回”
const bp=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='返回'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[0].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,returnByValue:true,awaitPromise:true,contextId:fl[0].ctx},L.sessionId).then(r=>r.result?.value).catch(()=>null);
console.log("返回 btn:",JSON.stringify(bp));
if(bp){await mouse(bp.x,bp.y);}
await sleep(5000);
const tabs2=await(await fetch("http://127.0.0.1:9222/json/list")).json();
tabs2.filter(t=>t.type==="page").forEach(t=>console.log("TAB:",t.url.slice(0,90)));
L.cdp.close();
