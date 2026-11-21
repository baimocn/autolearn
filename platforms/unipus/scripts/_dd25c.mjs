import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(400);
// list all digEmptySelectView element classes within block 25
const elems = await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];
  const out=[];
  [...b.querySelectorAll('[class*=digEmptySelectView]')].forEach(e=>{
    out.push({cls:(e.className||'').toString().slice(0,70),tag:e.tagName,txt:(e.innerText||'').slice(0,20)});
  });
  return out;
})()`, tb.ctx);
console.log("DIG ELEMENTS:", JSON.stringify(elems, null, 1));
L.cdp.close();
