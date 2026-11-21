import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
const info=await ev(`(()=>{
  const cols=[...document.querySelectorAll('[class*=collapsible-container]')];
  return {total:cols.length,
    details:cols.map((c,i)=>{const body=c.querySelector('[class*=collapsible-content]');const head=c.querySelector('[class*=collapsible-head]');
      const h=body?Math.round(body.getBoundingClientRect().height):-1;
      const blocks=c.querySelectorAll('div.editor-question-block.questionBlockNode').length;
      return {i,h,blocks,headTxt:head?(head.innerText||'').replace(/\s+/g,' ').slice(0,30):''};})};})()`,tb.ctx);
console.log(JSON.stringify(info,null,1).slice(0,2000));
L.cdp.close();
