import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
// 全帧找 成绩提交
let found=false;
for(const f of await L.frames()){
  const info=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('*')].filter(e=>/成绩提交/.test(n(e.innerText||''))&&e.getBoundingClientRect().width>50&&e.getBoundingClientRect().height>20&&e.children.length<4);return v.slice(0,3).map(e=>({t:(e.innerText||'').replace(/\s+/g,'').slice(0,16),w:Math.round(e.getBoundingClientRect().width),x:Math.round(e.getBoundingClientRect().left+e.getBoundingClientRect().width/2),y:Math.round(e.getBoundingClientRect().top+e.getBoundingClientRect().height/2)}));})()`,f.ctx).catch(()=>null);
  if(info&&info.length){console.log("FOUND@",f.url.slice(40,60),JSON.stringify(info));found=true;}
}
console.log("found:",found);
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("score-now.png",Buffer.from(data,"base64"));
L.cdp.close();
