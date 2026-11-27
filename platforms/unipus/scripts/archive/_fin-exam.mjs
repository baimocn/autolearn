import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const ex=(await L.frames()).find(f=>/\/exam\/|testing\/challenge/.test(f.url)&&f.ctx);
if(!ex){console.log("NO EXAM FRAME");process.exit(0);}
console.log("exam:",ex.url.slice(45,85));
const picks=[1,1,0,0,0]; // B B A A A
const r=await ev(`(async()=>{
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  const idx=${JSON.stringify(picks)};
  const out=[];
  for(let i=0;i<items.length;i++){
    const rows=[...items[i].querySelectorAll('[class*=chioceView_strongListView]')];
    const k=idx[i]??0;
    if(rows[k]){rows[k].click();out.push(i+":"+k);}
    await new Promise(r2=>setTimeout(r2,200));
  }
  return out;})()`,ex.ctx);
console.log("picked:",JSON.stringify(r));
await sleep(1200);
const sub=await ev(`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='提交'&&e.getBoundingClientRect().width>10);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx);
console.log("submit:",sub);
await sleep(3500);
let conf=0;
for(let k=0;k<8&&!conf;k++){
  for(const f of await L.frames()){
    conf=await ev(`(()=>{const b=document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');if(!b)return 0;b.click();return 1;})()`,f.ctx).catch(()=>0);
    if(conf)break;
  }
  if(!conf)await sleep(1500);
}
console.log("confirm:",conf);
await sleep(5000);
let posted=false;
for(let k=0;k<12;k++){
  for(const f of await L.frames()){
    const rr=await ev(`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
    if(rr){console.log("成绩提交 clicked");posted=true;break;}
  }
  if(posted)break;
  await sleep(1800);
}
console.log("posted:",posted);
await sleep(3000);
for(const f of await L.frames()){
  const t=await ev(`(()=>{const t2=document.body.innerText;const m=t2.replace(/\s+/g,' ').match(/(本轮成绩|提交成功|成绩提交成功)[^。]{0,50}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
  if(t)console.log("RESULT:",t);
}
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("u4-fin.png",Buffer.from(data,"base64"));
L.cdp.close();
