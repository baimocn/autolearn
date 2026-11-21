import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
// 滚动考试容器
for(let k=0;k<12;k++){
 await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.85));const ex=document.querySelector('[class*=exam]');return 1;})()`,ex.ctx).catch(()=>{});
 await sleep(1200);
}
await sleep(2000);
const qs=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 return items.map((q,i)=>{const t=(q.innerText||'').replace(/[ ]+/g,' ');
  const opts=[...q.querySelectorAll('[class*=chioceView_strongListView]')].map((r,j)=>String.fromCharCode(65+j)+':'+((r.innerText||'').replace(/[ ]+/g,' ').trim().slice(0,40)));
  const ins=[...q.querySelectorAll('input.answer_answerInput')].length;
  const rows=opts.length;
  if(rows===0&&ins===0)return null;
  return {i,stem:t.slice(0,200),opts,ins,type:rows?'choice':'fill'};}).filter(Boolean);})()`,ex.ctx).catch(e=>String(e));
fs.writeFileSync('ut4-q2.json',JSON.stringify(qs,null,1));
console.log('count',Array.isArray(qs)?qs.length:qs);
if(Array.isArray(qs))qs.forEach(q=>{console.log('--- Q'+q.i+' ['+q.type+']');console.log(q.stem);if(q.opts.length)console.log('  '+q.opts.join(' | '));});
cdp.close();
