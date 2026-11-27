import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
const info=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][24];
 if(!b)return null;
 return {txt:(b.innerText||'').replace(/\s+/g,' ').slice(0,200),
   fileInputs:b.querySelectorAll('input[type=file]').length,
   antBtns:b.querySelectorAll('.ant-upload-btn').length,
   uploadEls:b.querySelectorAll('[class*=upload],[class*=Upload]').length,
   cls:[...b.querySelectorAll('[class*=upload],[class*=Upload]')].slice(0,6).map(e=>(e.className||'').toString().slice(0,40))};})()`,tb.ctx);
console.log(JSON.stringify(info,null,1));
L.cdp.close();
