import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][13];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(500);
const info = await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][13];
  const t=b.innerText;
  // answer section
  const k=t.lastIndexOf('\\n答案');
  return {
    shownVals:[...b.querySelectorAll('input[type=text]')].map(e=>JSON.stringify(e.value)),
    answerSection:k>=0?t.slice(k):'(none)',
    score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]
  };
})()`, tb.ctx);
console.log(JSON.stringify(info, null, 1));
L.cdp.close();
