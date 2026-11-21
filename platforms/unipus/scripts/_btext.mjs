import { connect } from "./utlib.mjs";
const I=Number(process.argv[2]||21);
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];return (b.innerText||'').replace(/[ ]+/g,' ').slice(0,220);})()`,tb.ctx).catch(e=>String(e));
console.log('block'+I+':',r);
cdp.close();
