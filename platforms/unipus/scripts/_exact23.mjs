import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find(
  (f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12))
);
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(400);
// fresh answer state -> click 重新作答
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&e.innerText.replace(/\\s+/g,'')==='重新作答');
 if(el)el.click();return !!el;})()`, tb.ctx);
await sleep(2500);
// TYPE exact answer-key strings via native setter
const exact = ['Sericulture','sustenance','agrarian','hybrid rice','drought-resistant crops','Silk reeling'];
await ev(`(()=>{
 const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const els=[...b.querySelectorAll('input[type=text]')];const vals=${JSON.stringify(exact)};
 const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
 els.forEach((e,k)=>{e.focus();set.call(e,vals[k]);
   e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
 return els.map(e=>e.value);
})()`, tb.ctx);
await sleep(500);
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&e.innerText.replace(/\\s+/g,'')==='提交');
 el.click();return 1;})()`, tb.ctx);
await sleep(5500);
const score = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];const t=b.innerText;return (t.match(/得分[:：]?\\s*(\\d+(?:\\.\\d+)?)/)||[])[1];})()`, tb.ctx);
console.log("EXACT-TYPE SCORE:", score);
L.cdp.close();
