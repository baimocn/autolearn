import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(600);
const st = await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][1];
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  return {score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1],
    ibtns:[...b.querySelectorAll('[class*=i-button]')].map(e=>e.innerText.replace(/\\s+/g,'')),
    digs:b.querySelectorAll('[class*=digEmpty]').length,
    inputs:b.querySelectorAll('input[type=text]').length,
    head:t.slice(0,200)};
})()`, tb.ctx);
console.log(JSON.stringify(st, null, 1));
L.cdp.close();
