import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
// 1) 点所有选择题第一项
const a=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];let n=0;
 items.forEach(q=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
  if(rows.length){rows[0].click();n++;}});
 return n;})()`,ex.ctx).catch(e=>String(e));
console.log('choices clicked',a);
// 2) 填所有 input/textarea
const b=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];let n=0;
 const words=['reach out','tune in','all told','up in the air','teem with','Agriculture is important for sustainable development.'];
 let wi=0;
 items.forEach(q=>{const els=[...q.querySelectorAll('input.answer_answerInput,textarea,input[type=text]')];
  els.forEach(el=>{
   const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
   const v=words[wi%words.length];wi++;
   Object.getOwnPropertyDescriptor(proto,'value').set.call(el,v);
   el.dispatchEvent(new Event('input',{bubbles:true}));
   el.dispatchEvent(new Event('change',{bubbles:true}));
   el.dispatchEvent(new Event('blur',{bubbles:true}));
   n++;
  });});
 return n;})()`,ex.ctx).catch(e=>String(e));
console.log('inputs filled',b);
await sleep(2500);
// 3) 读答题卡进度
const prog=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/([0-9]+)\s*\/\s*26/);return m?m[0]:'n/a';})()`,ex.ctx).catch(()=>'err');
console.log('progress',prog);
const filled=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];return items.map((q,i)=>{const ins=[...q.querySelectorAll('input.answer_answerInput')].map(e=>e.value);const sel=q.querySelectorAll('[class*=chioceView_itemSelected],[class*=selected]').length;return {i,ins,sel};}).filter(x=>x.ins.length||x.sel);})()`,ex.ctx).catch(e=>String(e));
console.log('filled state',JSON.stringify(filled).slice(0,1500));
cdp.close();
