import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=(await L.frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[1].slice(0,12)));
const { ev }=L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
await sleep(800);
const info=await ev(`(()=>{
 const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const inps=[...b.querySelectorAll('input')].map(e=>({type:e.type,ro:e.readOnly,disabled:e.disabled,val:e.value,cls:(e.className||'').toString().slice(0,40)}));
 // candidate bank word elements
 const words=['sericulture','silk reeling','hybrid rice'];
 const bank=[];
 [...b.querySelectorAll('*')].forEach(e=>{ if(e.children.length===0){const tx=(e.innerText||'').trim(); if(words.includes(tx)){const r=e.getBoundingClientRect(); bank.push({tx,tag:e.tagName,cls:(e.className||'').toString().slice(0,40),w:Math.round(r.width),cursor:getComputedStyle(e).cursor});}}});
 return {nInput:b.querySelectorAll('input').length,inps:inps.slice(0,8),bank:[...new Map(bank.map(x=>[x.tx+x.cls,x])).values()]};
})()`,tb.ctx);
console.log(JSON.stringify(info,null,1));
L.cdp.close();
