import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(500);
// enter redo
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
 const el=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>e.innerText.replace(/\\s+/g,'')==='重新作答');
 if(el)el.click();return !!el;})()`, tb.ctx);
await sleep(2200);
const info = await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
  const blanks=[...b.querySelectorAll('[class*=digEmptyView_blankView],[class*=editor-dig-empty]')].map(e=>({
    cls:e.className.toString().slice(0,55),txt:(e.innerText||'').slice(0,30),
    trigger:!!e.querySelector('[class*=selectTrigger],[class*=trigger],[class*=digEmptyIndex]')}));
  // any trigger-like elements
  const trigs=[...new Set([...b.querySelectorAll('[class*=digEmptyView]')].map(e=>e.className.toString().split(' ')[0]))];
  return {blankCount:blanks.length, blanks:blanks.slice(0,12), digClasses:trigs};
})()`, tb.ctx);
console.log(JSON.stringify(info, null, 1));
L.cdp.close();
