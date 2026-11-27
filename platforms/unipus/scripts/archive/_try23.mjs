import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=(await L.frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[1].slice(0,12)));
const { ev }=L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
await sleep(800);
// focus first input via CDP-ish focus, then click first bank word
const r1=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
  const inp=b.querySelector('input[type=text]'); inp.focus();
  const r=inp.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,val:inp.value};})()`,tb.ctx);
console.log("input1:",JSON.stringify(r1));
const bw=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
  const w=[...b.querySelectorAll('span.answerView_questionViewOptionsItem__OU93')][0];
  const r=w.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,tx:w.innerText};})()`,tb.ctx);
console.log("bankword:",JSON.stringify(bw));
// coords are within iframe; we must dispatch real events with iframe offset
const off=await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src));const r=f.getBoundingClientRect();return {x:r.left,y:r.top};})()`);
console.log("iframe offset:",JSON.stringify(off));
// dispatch click on word within frame using elementFromPoint-free native click
const clicked=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
  const w=[...b.querySelectorAll('span.answerView_questionViewOptionsItem__OU93')][0];
  const r=w.getBoundingClientRect(); const o={bubbles:true,cancelable:true,view:window,clientX:r.left+r.width/2,clientY:r.top+r.height/2};
  w.dispatchEvent(new PointerEvent('pointerdown',o));w.dispatchEvent(new MouseEvent('mousedown',o));w.dispatchEvent(new PointerEvent('pointerup',o));w.dispatchEvent(new MouseEvent('mouseup',o));w.dispatchEvent(new MouseEvent('click',o));
  return 1;})()`,tb.ctx);
await sleep(800);
const vals=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];return [...b.querySelectorAll('input[type=text]')].map(e=>e.value);})()`,tb.ctx);
console.log("vals after word click:",JSON.stringify(vals));
L.cdp.close();
