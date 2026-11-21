import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
// 点答题卡第8题
const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const btns=[...document.querySelectorAll('div,span,button')].filter(e=>e.children.length<=1&&n(e.innerText)==='8'&&e.getBoundingClientRect().width>20&&e.getBoundingClientRect().width<60);if(!btns.length)return 'no btn 8';btns[btns.length-1].click();return 'clicked 8';})()`,ex.ctx).catch(e=>String(e));
console.log(r);
await sleep(2500);
// 看第 8 题对应 questionItem 的结构
const d=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const out=[];
 items.forEach((q,i)=>{const t=(q.innerText||'').replace(/[ ]+/g,' ');
  const rows=q.querySelectorAll('[class*=chioceView_strongListView]').length;
  const ins=q.querySelectorAll('input.answer_answerInput').length;
  const anyIn=q.querySelectorAll('input,textarea,[contenteditable]').length;
  const opts=q.querySelectorAll('[class*=questionViewOptionsItem]').length;
  const drag=q.querySelectorAll('[draggable=true]').length;
  if(rows===0)out.push({i,rows,ins,anyIn,opts,drag,head:t.slice(0,90)});});
 return out;})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(d,null,1).slice(0,3000));
cdp.close();
