import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
const before=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx);
// 逐个展开
const n=await ev(`(async()=>{
  const cols=[...document.querySelectorAll('[class*=collapsible-container]')];
  let opened=0;
  for(const c of cols){
    const body=c.querySelector('[class*=collapsible-content]');
    if(!body)continue;
    const h=body.getBoundingClientRect().height;
    if(h<20){
      const head=c.querySelector('[class*=collapsible-head]');
      if(head){
        const rk=Object.keys(head).find(k=>k.startsWith('__reactProps'));
        try{if(rk&&head[rk].onClick)head[rk].onClick({stopPropagation(){},preventDefault(){},target:head,currentTarget:head,nativeEvent:{}});else head.click();}catch(e){head.click();}
        opened++;
        await new Promise(r=>setTimeout(r,400));
      }
    }
  }
  return opened;})()`,tb.ctx);
console.log("opened:",n);
await sleep(5000);
const after=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx);
const lens=await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`,tb.ctx);
console.log("blocks:",before,"->",after);
console.log("LENS:",JSON.stringify(lens));
L.cdp.close();
