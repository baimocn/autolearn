import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(500);
const info = await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
  const item=b.querySelector('[class*=questionItem]');
  // list option-like rows within first questionItem
  const rows=[...item.querySelectorAll('*')].filter(e=>{
    const t=(e.innerText||'').trim();
    return e.children.length<=3 && /[A-D]\\./.test(t.slice(0,6)) === false && t.length>0 && t.length<60;
  }).slice(0,30).map(e=>({tag:e.tagName,cls:(e.className||'').toString().slice(0,55),t:e.innerText.replace(/\\s+/g,' ').slice(0,40)}));
  // distinct option container classes
  const cls=[...new Set([...item.querySelectorAll('*')].map(e=>(e.className||'').toString()).filter(c=>/option|chioce|choice|view|row|item/i.test(c)))].slice(0,25);
  return {rows,cls};
})()`, tb.ctx);
console.log(JSON.stringify(info, null, 1));
L.cdp.close();
