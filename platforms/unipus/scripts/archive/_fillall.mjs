import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const r=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 let n=0, detail=[];
 items.forEach((q,i)=>{
  const els=[...q.querySelectorAll('input,textarea,[contenteditable=true],[contenteditable=""]')];
  if(!els.length)return;
  els.forEach(el=>{
   const tag=el.tagName;
   if(tag==='INPUT'||tag==='TEXTAREA'){
    const proto=tag==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'sustainable agriculture');
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    el.dispatchEvent(new Event('blur',{bubbles:true}));
   } else {
    el.innerText='sustainable agriculture';
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('blur',{bubbles:true}));
   }
   n++;
  });
  detail.push({i,els:els.length,tags:els.map(e=>e.tagName)});
 });
 return {n,detail};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r).slice(0,1500));
await sleep(2500);
const prog=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(\d+)\s*\/\s*(\d+)/);return m?m[0]:'n/a';})()`,ex.ctx).catch(()=>'err');
console.log('progress',prog);
cdp.close();
