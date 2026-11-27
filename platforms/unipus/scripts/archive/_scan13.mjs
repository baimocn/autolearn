import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
const rows = await ev(`(()=>{
  return [...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map((b,i)=>{
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    return {i, n:b.querySelectorAll('input[type=text]').length, score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]||'',
      redo:/重新作答/.test(t)?1:0, sub:/提交/.test(t)?1:0, h:t.slice(0,22)};
  });
})()`, tb.ctx);
console.log(JSON.stringify(rows, null, 0));
L.cdp.close();
