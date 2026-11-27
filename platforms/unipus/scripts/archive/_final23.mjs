import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find(
  (f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12))
);
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(500);
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&e.innerText.replace(/\\s+/g,'')==='重新作答');
 if(el)el.click();return !!el;})()`, tb.ctx);
await sleep(2500);
const order = ['sericulture','sustenance','agrarian','hybrid rice','drought-resistant crop','silk reeling'];
const filled = await ev(`(async()=>{
 const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const inputs=[...b.querySelectorAll('input[type=text]')];
 const opts=[...b.querySelectorAll('[class*=questionViewOptionsItem]')];
 const find=t=>opts.find(o=>o.innerText.trim()===t);
 for(let k=0;k<${order.length};k++){
   inputs[k].focus(); await new Promise(r=>setTimeout(r,90));
   const w=find(${JSON.stringify(order)}[k]); const rk=Object.keys(w).find(x=>x.startsWith('__reactProps'));
   w[rk].onClick({stopPropagation(){},preventDefault(){},target:w,currentTarget:w,nativeEvent:{}});
   await new Promise(r=>setTimeout(r,140));
 }
 return inputs.map(e=>e.value);
})()`, tb.ctx);
console.log("filled:", JSON.stringify(filled));
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&e.innerText.replace(/\\s+/g,'')==='提交');
 el.click();return 1;})()`, tb.ctx);
await sleep(5500);
const score = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];const t=b.innerText;return {score:(t.match(/得分[:：]?\\s*(\\d+(?:\\.\\d+)?)/)||[])[1],redo:/重新作答/.test(t)};})()`, tb.ctx);
console.log("RESULT:", JSON.stringify(score));
L.cdp.close();
