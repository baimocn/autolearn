import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
if(!tb){console.log('no tb');process.exit(1);}
const r=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
 return bs.map((b,i)=>{const t=(b.innerText||'').replace(/[ ]+/g,' ');
  const rec=b.querySelectorAll('[class*=record_]').length;
  const file=b.querySelectorAll('input[type=file]').length;
  const m=t.match(/得分[^0-9]*([0-9.]+)/);
  if(!rec&&!file)return null;
  return {i,rec,file,score:m?m[1]:null,head:t.slice(0,60)};}).filter(Boolean);})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1));
cdp.close();
