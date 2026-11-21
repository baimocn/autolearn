import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
// 滚动让剩余题挂载
for(let k=0;k<10;k++){await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.85));return 1;})()`,ex.ctx).catch(()=>{});await sleep(1000);}
const r=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 let filled=0, blanks=0;
 items.forEach((q,i)=>{
  const ins=[...q.querySelectorAll('input.answer_answerInput,textarea')];
  ins.forEach(el=>{blanks++;
   const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
   Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'sustainable agriculture development');
   el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));
   filled++;});});
 return {items:items.length,blanks,filled};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r));
await sleep(2000);
const prog=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(\d+)\s*\/\s*(\d+)/);return m?m[0]:'n/a';})()`,ex.ctx).catch(()=>'err');
console.log('progress',prog);
cdp.close();
