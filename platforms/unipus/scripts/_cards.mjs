import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
if(!rd){console.log("NO READER");process.exit(0);}
const L=await connect(rd.id);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
if(!tb){console.log("NO TB");process.exit(0);}
const ev=async(e)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);return r.result?.value;};
const cards=await ev(`(()=>{
  return [...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')].map((c,i)=>{
    const img=c.querySelector('img');
    let src=img?img.src:'';
    let dec='';try{dec=decodeURIComponent(src);}catch(e){dec=src;}
    const b=c.getBoundingClientRect();
    return {i, hasImg:!!img, dec:dec.slice(-90), cls:(c.className||'').toString().slice(0,40), top:Math.round(b.top), h:Math.round(b.height)};
  });})()`);
console.log("CARDS:",JSON.stringify(cards,null,1));
L.cdp.close();
