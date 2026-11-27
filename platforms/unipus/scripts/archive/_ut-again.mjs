import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
// DOM 点再次作答（各帧）
let clicked=false;
for(const f of await L.frames()){
  const r=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='再次作答'&&e.getBoundingClientRect().width>20);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
  if(r){console.log("再次作答 clicked @",f.url.slice(40,60));clicked=true;break;}
}
console.log("clicked:",clicked);
await sleep(5000);
// 检查是否可编辑（有无未选中项）
const ex=(await L.frames()).find(f=>/\/exam\/|testing\//.test(f.url)&&f.ctx);
if(ex){
  const st=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
    let answered=0,rowsTotal=0;
    items.forEach(q=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];rowsTotal+=rows.length;if(rows.some(r=>/selected/.test(r.className.toString())))answered++;});
    const hasAgain=[...document.querySelectorAll('button,div,span')].some(e=>(e.innerText||'').replace(/\s+/g,'')==='再次作答'&&e.getBoundingClientRect().width>20);
    return {items:items.length,rowsTotal,answered,hasAgain};})()`,ex.ctx);
  console.log("state:",JSON.stringify(st));
}
L.cdp.close();
