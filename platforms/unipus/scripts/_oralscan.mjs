import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
let tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
console.log("chapter:",tb?tb.url.slice(73,110):"none");
// 展开折叠区
const opened=await ev(`(async()=>{
  const cols=[...document.querySelectorAll('[class*=collapsible-container]')];let opened=0;
  for(const c of cols){
    const body=c.querySelector('[class*=collapsible-content]');
    if(!body)continue;
    if(body.getBoundingClientRect().height<20){
      const head=c.querySelector('[class*=collapsible-head]');
      if(head){const rk=Object.keys(head).find(k=>k.startsWith('__reactProps'));
        try{if(rk&&head[rk].onClick)head[rk].onClick({stopPropagation(){},preventDefault(){},target:head,currentTarget:head,nativeEvent:{}});else head.click();}catch(e){head.click();}
        opened++;await new Promise(r=>setTimeout(r,350));}
    }
  }
  return opened;})()`,tb.ctx).catch(()=>0);
console.log("expanded:",opened);
await sleep(3000);
// 滚动全章找 oral 块
const total=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0);
console.log("blocks:",total);
const orals=[];
for(let i=0;i<total;i++){
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx).catch(()=>{});
  await sleep(900);
  const s=await ev(`(()=>{
    const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(!b)return null;
    const t=(b.innerText||'');
    const rec=b.querySelector('[class*=record_record-prepare],[class*=record_record-recording]')?1:0;
    return {i,rec,mic:/录音|麦克风|朗读|Read aloud/i.test(t)?1:0,len:t.length,
      score:(t.replace(/\s+/g,' ').match(/得分[:：]?\s*(\d+(\.\d+)?)/)||[])[1]??null,done:/重新作答/.test(t)};})()`,tb.ctx).catch(()=>null);
  if(s&&(s.rec||s.mic))orals.push(s);
}
console.log("ORALS:",JSON.stringify(orals));
L.cdp.close();
