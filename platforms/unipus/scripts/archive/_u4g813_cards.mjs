import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
const tabs=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>t.type==="page"&&/ucontent/.test(t.url));
let target=null;
for(const t of tabs){const L0=await connect(t.id);const fl=await L0.frames();const tb=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);
 const ch=tb?(tb.url.match(/chapter\/([0-9a-f-]+)/)||[])[1]:"";L0.cdp.close();if(ch===CH[4]){target=t.id;break;}}
const L=await connect(target);const fl=await L.frames();const tb=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const d=await L.ev(`(()=>[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')].map((c,i)=>{
  const img=c.querySelector('img');let src='';try{src=decodeURIComponent(img?img.src:'');}catch(e){src=img?img.src:'';}
  const prev=c.previousElementSibling?(c.previousElementSibling.innerText||'').replace(/\s+/g,' ').slice(0,80):'';
  const next=c.nextElementSibling?(c.nextElementSibling.innerText||'').replace(/\s+/g,' ').slice(0,80):'';
  const r=c.getBoundingClientRect();
  return {i,id:c.id,status:c.getAttribute('data-lexical-node-status'),img:src.slice(-120),
    top:Math.round(r.top),prev,next,html:c.outerHTML.slice(0,300)};}))()`,tb.ctx).catch(e=>({err:String(e).slice(0,150)}));
console.log(JSON.stringify(d,null,1).slice(0,4000));
// 找 Unit test 4 文本位置
const ut=await L.ev(`(()=>{const out=[];[...document.querySelectorAll('*')].forEach(e=>{if(e.children.length>0)return;const t=(e.innerText||'').trim();if(/^Unit test 4$/.test(t)){const r=e.getBoundingClientRect();out.push({txt:t,top:Math.round(r.top),left:Math.round(r.left)});}});return out;})()`,tb.ctx).catch(e=>String(e));
console.log("Unit test 4 文本:",JSON.stringify(ut));
L.cdp.close();
