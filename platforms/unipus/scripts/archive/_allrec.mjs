import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
 return bs.map((b,i)=>{const t=(b.innerText||'').replace(/[ ]+/g,' ');return{i,len:t.length,rec:b.querySelectorAll('[class*=record_]').length,file:b.querySelectorAll('input[type=file]').length,head:t.slice(0,40)};}).filter(x=>x.rec||x.file);})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1));
cdp.close();
