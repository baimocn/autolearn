import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
 return bs.slice(21).map((b,i)=>{const t=(b.innerText||'').replace(/[ ]+/g,' ');return {i:i+21,len:t.length,head:t.slice(0,60),tail:t.slice(-50),file:b.querySelectorAll('input[type=file]').length,sub:[...b.querySelectorAll('[class*=i-button]')].some(e=>(e.innerText||'').replace(/[ ]+/g,'')==='提交')};});})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1));
cdp.close();
