import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const fl=await L.frames();
const ex=fl.find(f=>/testing\/(challenge|diagnosis)\/book/.test(f.url)&&f.ctx);
if(!ex){console.log("NO CHALLENGE FRAME");process.exit(0);}
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
// 每题点 A
const n=await ev(`(()=>{
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  items.forEach(q=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];if(rows[0])rows[0].click();});
  return items.length;})()`,ex.ctx);
console.log("answered:",n);
await sleep(1500);
// 找提交
const btns=await ev(`[...document.querySelectorAll('button,[class*=i-button],div,span')].map(e=>({t:(e.innerText||'').replace(/\s+/g,'').slice(0,10),w:Math.round(e.getBoundingClientRect().width)})).filter(x=>x.t&&x.w>15&&/提交|上一题|下一题|确定/.test(x.t)).slice(0,10)`,ex.ctx);
console.log("BTNS:",JSON.stringify(btns));
// 直接 JS 点提交
let sub=await ev(`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='提交'&&e.getBoundingClientRect().width>10);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx);
console.log("submit:",sub);
await sleep(3000);
// 确定（各帧）
for(let k=0;k<6;k++){
  let hit=false;
  for(const f of await L.frames()){
    const r2=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确定|确认)$/.test(n2(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>0);
    if(r2){console.log("确定 @",f.url.slice(0,40));hit=true;break;}
  }
  if(!hit)break;
  await sleep(2000);
}
await sleep(4000);
// 结果文本 + 成绩提交
for(const f of await L.frames()){
  const t=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const d=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=result],[class*=popup]')].find(e=>e.getBoundingClientRect().height>80);return d?d.innerText.replace(/\s+/g,' ').slice(0,260):'';})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>"");
  if(t&&t.length>10)console.log("DLG",f.url.slice(0,40),"=>",t);
}
let sc=false;
for(let k=0;k<8;k++){
  let hit=false;
  for(const f of await L.frames()){
    const r3=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>0);
    if(r3){console.log("点成绩提交 @",f.url.slice(0,40));hit=true;sc=true;break;}
  }
  if(hit)break;
  const again=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');return [...document.querySelectorAll('button,div,span')].filter(e=>/^(再次挑战|开始挑战)$/.test(n2(e.innerText))&&e.getBoundingClientRect().width>15).length;})()`,returnByValue:true,awaitPromise:true,contextId:ex.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>0);
  if(again)console.log("已到结果页(再次挑战 present)");
  await sleep(1500);
}
await sleep(3000);
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("cha-result.png",Buffer.from(data,"base64"));
console.log("scored:",sc,"screenshot cha-result.png");
L.cdp.close();
