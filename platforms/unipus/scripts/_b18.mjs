import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][18];const t=(b.innerText||'').replace(/[ ]+/g,' ');
 return {len:t.length,text:t.slice(0,2500)};})()`,tb.ctx).catch(e=>String(e));
console.log(r.text||JSON.stringify(r));
cdp.close();
