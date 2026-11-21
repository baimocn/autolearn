import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("cha-vision.png",Buffer.from(data,"base64"));
console.log("saved");
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
for(const f of await L.frames()){
  const b=await ev(`(()=>{const out=[];[...document.querySelectorAll('button,div,span,a')].forEach(e=>{if(e.children.length>1)return;const t=(e.innerText||'').replace(/\s+/g,'').trim();const bb=e.getBoundingClientRect();if(t&&t.length<10&&bb.width>15&&bb.top>150&&bb.top<window.innerHeight)out.push({t,x:Math.round(bb.left+bb.width/2),y:Math.round(bb.top+bb.height/2)});});return out.filter(x=>/挑战|答题|知道|确定|提交/.test(x.t)).slice(0,10);})()`,f.ctx).catch(()=>null);
  if(b&&b.length)console.log("BTNS@",f.url.slice(40,66),"=>",JSON.stringify(b));
}
L.cdp.close();
