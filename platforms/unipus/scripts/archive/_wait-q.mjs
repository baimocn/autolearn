import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const ex=(await L.frames()).find(f=>/\/exam\//.test(f.url)&&f.ctx);
for(let k=0;k<6;k++){
  // 每题滚动到视口触发懒加载
  await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];items.forEach(it=>it.scrollIntoView&&it.scrollIntoView({block:'center'}));return 1;})()`,ex.ctx).catch(()=>{});
  await sleep(2500);
  const info=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];return items.map(q=>(q.innerText||'').replace(/\s+/g,' ').slice(0,100));})()`,ex.ctx);
  const filled=(info||[]).filter(x=>x.replace(/[0-9.\sABCD]/g,'').length>20).length;
  console.log(`try${k}: filled=${filled}/5`);
  if(filled>=3)break;
}
const info=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];return items.map(q=>(q.innerText||'').replace(/\s+/g,' ').slice(0,160));})()`,ex.ctx);
console.log(JSON.stringify(info,null,1));
L.cdp.close();
