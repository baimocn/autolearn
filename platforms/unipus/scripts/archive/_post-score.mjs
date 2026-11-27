import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
// 先找 DOM 里的成绩提交（各帧）
let clicked=false;
for(const f of await L.frames()){
  const r=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
  if(r){console.log("成绩提交 @",f.url.slice(40,60));clicked=true;break;}
}
if(!clicked){
  // 坐标兜底：成绩弹窗按钮可能在底部（截图 1.355x 缩放）
  // 常见位置：成绩提交 ≈ CSS(712,712)? 先截图定位
  const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
  const fs=await import("node:fs");
  fs.writeFileSync("post-score.png",Buffer.from(data,"base64"));
  console.log("no DOM button, screenshot saved post-score.png");
}
await sleep(2500);
L.cdp.close();
