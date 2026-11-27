import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 点 开始挑战（真鼠标 597,527）
await mouse(597,527);
await sleep(5000);
let ex=null;
for(let k=0;k<20;k++){
  ex=(await L.frames()).find(f=>(f.url.includes("/testing/challenge/")||f.url.includes("/testing/diagnosis/"))&&f.ctx);
  if(ex)break;
  await sleep(1000);
}
console.log("challenge frame:",ex?ex.url.slice(50,88):"NONE");
if(!ex){process.exit(0);}
// 答题
const n=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];items.forEach(q=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];if(rows[0])rows[0].click();});return items.length;})()`,ex.ctx);
console.log("answered:",n);
await sleep(1200);
const sub=await ev(`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='提交'&&e.getBoundingClientRect().width>10);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx);
console.log("submit:",sub);
await sleep(3000);
for(let k=0;k<6;k++){
  let hit=false;
  for(const f of await L.frames()){
    const r2=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确定|确认)$/.test(n2(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>0);
    if(r2){hit=true;break;}
  }
  if(!hit)break;
  await sleep(1800);
}
await sleep(3500);
let sc=false;
for(let k=0;k<8;k++){
  let hit=false;
  for(const f of await L.frames()){
    const r3=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>0);
    if(r3){console.log("成绩提交 clicked");hit=true;sc=true;break;}
  }
  if(hit)break;
  await sleep(1500);
}
console.log("scored:",sc);
for(const f of await L.frames()){
  const t=await ev(`(()=>{const d=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=result],[class*=popup]')].find(e=>e.getBoundingClientRect().height>60);return d?d.innerText.replace(/\s+/g,' ').slice(0,220):'';})()`,f.ctx).catch(()=>"");
  if(t&&t.length>8)console.log("RESULT:",t);
}
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("cha-fin.png",Buffer.from(data,"base64"));
L.cdp.close();
