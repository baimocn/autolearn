import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
tabs.filter(t=>t.type==="page").forEach(t=>console.log("TAB:",t.url.slice(0,130)));
const rd=tabs.find(t=>/ucontent/.test(t.url));
if(!rd){console.log("NO READER");process.exit(0);}
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
console.log("FULL URL:",rd.url.slice(0,300));
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
console.log("chapter:",tb?tb.url.slice(73,115):"none");
if(tb){
  const cards=await ev(`document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]').length`,tb.ctx);
  const blocks=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx);
  const lens=await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length).slice(0,30)`,tb.ctx);
  console.log("cards:",cards,"blocks:",blocks);
  console.log("LENS:",JSON.stringify(lens));
}
L.cdp.close();
