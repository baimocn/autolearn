import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
 return bs.map((b,i)=>{const t=(b.innerText||'').replace(/[ ]+/g,' ');
  const anchors=[...b.querySelectorAll('[data-lexical-node-anchor]')].map(e=>e.getAttribute('data-lexical-node-anchor')).slice(0,3);
  const types=[...b.querySelectorAll('[data-lexical-node-type]')].map(e=>e.getAttribute('data-lexical-node-type'));
  return {i,len:t.length,head:t.slice(0,50),tail:t.slice(-45),
   inp:b.querySelectorAll('input[type=text],textarea').length,
   file:b.querySelectorAll('input[type=file]').length,
   rec:b.querySelectorAll('[class*=record_]').length,
   vid:b.querySelectorAll('video').length,aud:b.querySelectorAll('audio').length,
   sel:b.querySelectorAll('[class*=selectTrigger],[class*=dropdown]').length,
   sub:[...b.querySelectorAll('[class*=i-button]')].some(e=>(e.innerText||'').replace(/[ ]+/g,'')==='提交'),
   redo:/重新作答/.test(t),score:(t.match(/得分[^0-9]*([0-9.]+)/)||[])[1]||null,
   collapsible:b.querySelectorAll('[class*=collapsible-container]').length,
   anchors,types:types.slice(0,4)};});
})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,9000));
cdp.close();
