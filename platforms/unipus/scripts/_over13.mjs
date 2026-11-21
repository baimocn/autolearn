import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][13];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(400);
const correct = ['Polyculture','slash-and-burn practice','Monoculture','agrochemicals','Secondary vegetation'];
const r = await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][13];
  const els=[...b.querySelectorAll('input[type=text]')];const vals=${JSON.stringify(correct)};
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,vals[k]);
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  // read back immediately AND after a tick
  const now=els.map(e=>e.value);
  return {now};
})()`, tb.ctx);
await sleep(800);
const afterTick = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][13];return [...b.querySelectorAll('input[type=text]')].map(e=>e.value);})()`, tb.ctx);
console.log("immediate:", JSON.stringify(r.now));
console.log("afterTick:", JSON.stringify(afterTick));
L.cdp.close();
