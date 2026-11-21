import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find(
  (f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12))
);
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][26];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(800);
const info = await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][26];
  if(!b) return 'NO';
  return {
    text:b.innerText.slice(0,600),
    files:b.querySelectorAll('input[type=file]').length,
    btns:[...b.querySelectorAll('div,button')].filter(e=>/i-button/.test(String(e.className))).map(e=>e.innerText.replace(/\\s+/g,'')).filter(Boolean).slice(0,10)
  };
})()`, tb.ctx);
console.log(JSON.stringify(info, null, 1));
L.cdp.close();
