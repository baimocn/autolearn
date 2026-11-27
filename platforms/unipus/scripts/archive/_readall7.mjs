import { connect } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const qs=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 return items.map((q,i)=>{const t=(q.innerText||'').replace(/[ ]+/g,' ').trim();
  const opts=[...q.querySelectorAll('[class*=chioceView_strongListView]')].map((r,j)=>String.fromCharCode(65+j)+':'+((r.innerText||'').replace(/[ ]+/g,' ').trim().slice(0,45)));
  const ins=[...q.querySelectorAll('input.answer_answerInput')].length;
  return {i,stem:t.slice(0,260),opts,ins,type:opts.length?'choice':(ins?'fill':'other')};}).filter(x=>x.type!=='other');})()`,ex.ctx).catch(e=>String(e));
fs.writeFileSync('ut7-all.json',JSON.stringify(qs,null,1));
console.log('total',Array.isArray(qs)?qs.length:qs);
if(Array.isArray(qs))qs.forEach(q=>{console.log('--- Q'+q.i+' ['+q.type+']');console.log(q.stem);if(q.opts.length)console.log('   '+q.opts.join(' | '));});
cdp.close();
