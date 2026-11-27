import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
console.log("chapter",tb.url.slice(60,115));
const r=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return bs.map((b,i)=>{const t=(b.innerText||'').replace(/\s+/g,' ');return {i,len:t.length,redo:/重新作答/.test(t),rec:b.querySelector('[class*=record_]')?1:0,tail:t.slice(-40)};}).filter(x=>x.redo||x.rec||x.len>2000);})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,3000));
cdp.close();
